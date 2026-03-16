import csv
import io
import uuid
from types import SimpleNamespace

from django.core.cache import cache
from django.db import transaction
from rest_framework import serializers

from shared.services.quota import QuotaExceededError, check_quota_before_create
from tenant.coaches.serializers import CoachSerializer
from tenant.students.models import Parent
from tenant.students.serializers import StudentSerializer


PREVIEW_CACHE_PREFIX = 'tenant_bulk_import_preview'
PREVIEW_TTL_SECONDS = 30 * 60
MAX_FILE_SIZE_BYTES = 1024 * 1024
MAX_ROWS = 250

TRUTHY_VALUES = {'true', '1', 'yes', 'y'}
FALSY_VALUES = {'false', '0', 'no', 'n'}

STUDENT_SCHEMA = {
    'dataset_type': 'students',
    'label': 'Students',
    'columns': [
        {'name': 'first_name', 'required': True, 'format': 'Text', 'description': 'Student first name.'},
        {'name': 'last_name', 'required': True, 'format': 'Text', 'description': 'Student last name.'},
        {'name': 'date_of_birth', 'required': True, 'format': 'YYYY-MM-DD', 'description': 'Student date of birth.'},
        {'name': 'gender', 'required': True, 'format': 'MALE|FEMALE|OTHER|PREFER_NOT_TO_SAY', 'description': 'Student gender enum.', 'allowed_values': ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']},
        {'name': 'email', 'required': False, 'format': 'Email', 'description': 'Optional student email address.'},
        {'name': 'phone', 'required': False, 'format': 'Text', 'description': 'Optional student phone number.'},
        {'name': 'emirates_id', 'required': False, 'format': 'Text', 'description': 'Optional Emirates ID.'},
        {'name': 'emergency_contact_name', 'required': False, 'format': 'Text', 'description': 'Optional emergency contact name.'},
        {'name': 'emergency_contact_phone', 'required': False, 'format': 'Text', 'description': 'Optional emergency contact phone.'},
        {'name': 'emergency_contact_relationship', 'required': False, 'format': 'Text', 'description': 'Optional emergency contact relationship.'},
        {'name': 'medical_notes', 'required': False, 'format': 'Text', 'description': 'Optional medical notes.'},
        {'name': 'allergies', 'required': False, 'format': 'Text', 'description': 'Optional allergies.'},
        {'name': 'is_active', 'required': False, 'format': 'true|false', 'description': 'Optional student status.', 'allowed_values': ['true', 'false']},
        {'name': 'enroll_class_id', 'required': False, 'format': 'Integer', 'description': 'Optional active class ID in the academy.'},
        {'name': 'parent_email', 'required': False, 'format': 'Email', 'description': 'Existing parent email or new parent email.'},
        {'name': 'parent_first_name', 'required': False, 'format': 'Text', 'description': 'Required when creating a new parent.'},
        {'name': 'parent_last_name', 'required': False, 'format': 'Text', 'description': 'Required when creating a new parent.'},
        {'name': 'parent_phone', 'required': False, 'format': 'Text', 'description': 'Optional parent phone number.'},
        {'name': 'parent_address_line1', 'required': False, 'format': 'Text', 'description': 'Optional parent address line 1.'},
        {'name': 'parent_address_line2', 'required': False, 'format': 'Text', 'description': 'Optional parent address line 2.'},
        {'name': 'parent_city', 'required': False, 'format': 'Text', 'description': 'Optional parent city.'},
        {'name': 'parent_state', 'required': False, 'format': 'Text', 'description': 'Optional parent state.'},
        {'name': 'parent_postal_code', 'required': False, 'format': 'Text', 'description': 'Optional parent postal code.'},
        {'name': 'parent_country', 'required': False, 'format': 'Text', 'description': 'Optional parent country.'},
    ],
    'sample_row': {
        'first_name': 'Sara',
        'last_name': 'Ali',
        'date_of_birth': '2014-05-20',
        'gender': 'FEMALE',
        'email': 'sara.ali@example.com',
        'phone': '',
        'emirates_id': '',
        'emergency_contact_name': 'Ali Hassan',
        'emergency_contact_phone': '+971500000000',
        'emergency_contact_relationship': 'Father',
        'medical_notes': '',
        'allergies': 'Peanuts',
        'is_active': 'true',
        'enroll_class_id': '',
        'parent_email': 'parent@example.com',
        'parent_first_name': 'Ali',
        'parent_last_name': 'Hassan',
        'parent_phone': '+971500000000',
        'parent_address_line1': '',
        'parent_address_line2': '',
        'parent_city': 'Dubai',
        'parent_state': '',
        'parent_postal_code': '',
        'parent_country': 'UAE',
    },
}

COACH_SCHEMA = {
    'dataset_type': 'coaches',
    'label': 'Coaches',
    'columns': [
        {'name': 'first_name', 'required': True, 'format': 'Text', 'description': 'Coach first name.'},
        {'name': 'last_name', 'required': True, 'format': 'Text', 'description': 'Coach last name.'},
        {'name': 'email', 'required': True, 'format': 'Email', 'description': 'Coach email. Must be unique in the academy.'},
        {'name': 'phone', 'required': False, 'format': 'Text', 'description': 'Optional coach phone number.'},
        {'name': 'specialization', 'required': False, 'format': 'Text', 'description': 'Optional specialization or sport focus.'},
        {'name': 'certifications', 'required': False, 'format': 'Text', 'description': 'Optional certifications.'},
        {'name': 'bio', 'required': False, 'format': 'Text', 'description': 'Optional coach bio.'},
        {'name': 'is_active', 'required': False, 'format': 'true|false', 'description': 'Optional coach status.', 'allowed_values': ['true', 'false']},
    ],
    'sample_row': {
        'first_name': 'Omar',
        'last_name': 'Khan',
        'email': 'omar.khan@example.com',
        'phone': '+971511111111',
        'specialization': 'Swimming',
        'certifications': 'Level 2',
        'bio': 'Former national coach',
        'is_active': 'true',
    },
}

SCHEMAS = {
    'students': STUDENT_SCHEMA,
    'coaches': COACH_SCHEMA,
}


def get_import_schema(dataset_type):
    schema = SCHEMAS[dataset_type]
    return {
        **schema,
        'required_columns': [col['name'] for col in schema['columns'] if col['required']],
        'template_headers': [col['name'] for col in schema['columns']],
    }


def preview_import(dataset_type, uploaded_file, academy, user):
    rows, headers = _parse_csv(uploaded_file, dataset_type)
    parser = _get_dataset_parser(dataset_type)

    request_stub = SimpleNamespace(academy=academy, user=user)
    row_results = []
    valid_payloads = []

    for row in rows:
        result = parser(row, request_stub)
        row_results.append(result)
        if result['status'] == 'valid':
            valid_payloads.append({
                'row_number': result['row_number'],
                'payload': result['normalized_data'],
            })

    token = _store_preview_payload(dataset_type, academy.id, user.id, len(rows), valid_payloads)
    unknown_columns = [header for header in headers if header not in get_import_schema(dataset_type)['template_headers']]

    return {
        'preview_token': token,
        'dataset_type': dataset_type,
        'total_rows': len(rows),
        'valid_rows': len(valid_payloads),
        'invalid_rows': len(rows) - len(valid_payloads),
        'columns_detected': headers,
        'unknown_columns': unknown_columns,
        'row_results': row_results,
    }


def commit_import(dataset_type, preview_token, academy, user, request):
    preview_payload = _load_preview_payload(preview_token, dataset_type, academy.id, user.id)
    valid_rows = preview_payload['valid_rows']

    quota_type = 'students' if dataset_type == 'students' else 'coaches'
    if valid_rows:
        check_quota_before_create(academy, quota_type, requested_increment=len(valid_rows))

    row_results = []
    created_ids = []

    for row in valid_rows:
        row_number = row['row_number']
        payload = row['payload']
        try:
            with transaction.atomic():
                serializer = _build_serializer(dataset_type, payload, request)
                serializer.is_valid(raise_exception=True)
                instance = serializer.save()
            created_ids.append(instance.id)
            row_results.append({
                'row_number': row_number,
                'status': 'created',
                'record_id': instance.id,
                'errors': [],
                'warnings': [],
            })
        except serializers.ValidationError as exc:
            row_results.append({
                'row_number': row_number,
                'status': 'failed',
                'record_id': None,
                'errors': _flatten_errors(exc.detail),
                'warnings': [],
            })

    failed_count = sum(1 for row in row_results if row['status'] == 'failed')
    created_count = len(created_ids)
    cache.delete(_preview_cache_key(preview_token))

    return {
        'dataset_type': dataset_type,
        'created_count': created_count,
        'skipped_count': preview_payload['total_rows'] - len(valid_rows),
        'failed_count': failed_count,
        'created_ids': created_ids,
        'row_results': row_results,
    }


def _parse_csv(uploaded_file, dataset_type):
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        raise serializers.ValidationError({
            'file': [f'File exceeds the {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB upload limit.']
        })

    try:
        content = uploaded_file.read().decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise serializers.ValidationError({'file': [f'Could not decode CSV file: {exc}']}) from exc
    finally:
        uploaded_file.seek(0)

    reader = csv.reader(io.StringIO(content))
    rows = list(reader)
    if not rows:
        raise serializers.ValidationError({'file': ['CSV file is empty.']})

    headers = [header.strip() for header in rows[0]]
    if not any(headers):
        raise serializers.ValidationError({'file': ['CSV header row is empty.']})
    if '' in headers:
        raise serializers.ValidationError({'file': ['CSV headers cannot contain blank column names.']})
    if len(headers) != len(set(headers)):
        raise serializers.ValidationError({'file': ['CSV headers must be unique.']})

    required_headers = set(get_import_schema(dataset_type)['required_columns'])
    missing_headers = sorted(required_headers - set(headers))
    if missing_headers:
        raise serializers.ValidationError({
            'file': [f'Missing required columns: {", ".join(missing_headers)}']
        })

    parsed_rows = []
    for row_number, values in enumerate(rows[1:], start=2):
        if not any(value.strip() for value in values):
            continue
        row_data = {headers[idx]: (values[idx].strip() if idx < len(values) else '') for idx in range(len(headers))}
        parsed_rows.append({
            'row_number': row_number,
            'raw': row_data,
            'has_extra_values': len(values) > len(headers),
        })

    if not parsed_rows:
        raise serializers.ValidationError({'file': ['CSV file has no data rows.']})
    if len(parsed_rows) > MAX_ROWS:
        raise serializers.ValidationError({'file': [f'CSV exceeds the {MAX_ROWS} row limit for a single import.']})

    return parsed_rows, headers


def _student_row_to_payload(row, academy):
    raw = row['raw']
    errors = []
    warnings = []

    payload = {
        key: value
        for key, value in {
            'first_name': raw.get('first_name', ''),
            'last_name': raw.get('last_name', ''),
            'date_of_birth': raw.get('date_of_birth', ''),
            'gender': raw.get('gender', '').upper(),
            'email': raw.get('email', ''),
            'phone': raw.get('phone', ''),
            'emirates_id': raw.get('emirates_id', ''),
            'emergency_contact_name': raw.get('emergency_contact_name', ''),
            'emergency_contact_phone': raw.get('emergency_contact_phone', ''),
            'emergency_contact_relationship': raw.get('emergency_contact_relationship', ''),
            'medical_notes': raw.get('medical_notes', ''),
            'allergies': raw.get('allergies', ''),
            'enroll_class_id': raw.get('enroll_class_id', ''),
        }.items()
        if value != ''
    }

    is_active = raw.get('is_active', '').strip()
    if is_active:
        try:
            payload['is_active'] = _parse_boolean(is_active)
        except serializers.ValidationError as exc:
            errors.extend(_flatten_errors(exc.detail))

    parent_email = raw.get('parent_email', '').strip().lower()
    parent_fields_present = any(
        raw.get(field, '').strip()
        for field in (
            'parent_first_name',
            'parent_last_name',
            'parent_phone',
            'parent_address_line1',
            'parent_address_line2',
            'parent_city',
            'parent_state',
            'parent_postal_code',
            'parent_country',
        )
    )
    if parent_fields_present and not parent_email:
        errors.append('parent_email is required when parent fields are provided.')

    if parent_email:
        existing_parent = Parent.objects.filter(academy=academy, email=parent_email).first()
        if existing_parent:
            payload['parent'] = existing_parent.id
            if parent_fields_present:
                warnings.append('Existing parent found by email. Additional parent columns were ignored.')
        else:
            parent_first_name = raw.get('parent_first_name', '').strip()
            parent_last_name = raw.get('parent_last_name', '').strip()
            if not parent_first_name or not parent_last_name:
                errors.append(
                    'parent_first_name and parent_last_name are required when parent_email does not match an existing parent.'
                )
            else:
                parent_data = {
                    'email': parent_email,
                    'first_name': parent_first_name,
                    'last_name': parent_last_name,
                }
                for csv_field, payload_field in (
                    ('parent_phone', 'phone'),
                    ('parent_address_line1', 'address_line1'),
                    ('parent_address_line2', 'address_line2'),
                    ('parent_city', 'city'),
                    ('parent_state', 'state'),
                    ('parent_postal_code', 'postal_code'),
                    ('parent_country', 'country'),
                ):
                    value = raw.get(csv_field, '').strip()
                    if value:
                        parent_data[payload_field] = value
                payload['parent_data'] = parent_data

    return payload, errors, warnings


def _coach_row_to_payload(row, _academy):
    raw = row['raw']
    payload = {
        key: value
        for key, value in {
            'first_name': raw.get('first_name', ''),
            'last_name': raw.get('last_name', ''),
            'email': raw.get('email', '').strip().lower(),
            'phone': raw.get('phone', ''),
            'specialization': raw.get('specialization', ''),
            'certifications': raw.get('certifications', ''),
            'bio': raw.get('bio', ''),
        }.items()
        if value != ''
    }
    errors = []
    if raw.get('is_active', '').strip():
        try:
            payload['is_active'] = _parse_boolean(raw['is_active'])
        except serializers.ValidationError as exc:
            errors.extend(_flatten_errors(exc.detail))
    return payload, errors, []


def _preview_student_row(row, request_stub):
    return _preview_row_with_serializer(row, request_stub, 'students', _student_row_to_payload)


def _preview_coach_row(row, request_stub):
    return _preview_row_with_serializer(row, request_stub, 'coaches', _coach_row_to_payload)


def _preview_row_with_serializer(row, request_stub, dataset_type, payload_builder):
    payload, errors, warnings = payload_builder(row, request_stub.academy)

    if row['has_extra_values']:
        errors.append('Row has more values than there are headers.')

    if not errors:
        serializer = _build_serializer(dataset_type, payload, request_stub)
        if not serializer.is_valid():
            errors.extend(_flatten_errors(serializer.errors))

    return {
        'row_number': row['row_number'],
        'status': 'invalid' if errors else 'valid',
        'normalized_data': payload,
        'errors': errors,
        'warnings': warnings,
    }


def _build_serializer(dataset_type, payload, request):
    if dataset_type == 'students':
        return StudentSerializer(
            data=payload,
            context={'request': request, 'disable_parent_invite': True},
        )
    return CoachSerializer(data=payload, context={'request': request})


def _parse_boolean(value):
    normalized = value.strip().lower()
    if normalized in TRUTHY_VALUES:
        return True
    if normalized in FALSY_VALUES:
        return False
    raise serializers.ValidationError('Accepted boolean values are true/false, yes/no, or 1/0.')


def _flatten_errors(detail, prefix=''):
    if isinstance(detail, list):
        flattened = []
        for item in detail:
            flattened.extend(_flatten_errors(item, prefix))
        return flattened
    if isinstance(detail, dict):
        flattened = []
        for key, value in detail.items():
            nested_prefix = f'{prefix}{key}: ' if prefix else f'{key}: '
            flattened.extend(_flatten_errors(value, nested_prefix))
        return flattened
    return [f'{prefix}{detail}'.strip()]


def _store_preview_payload(dataset_type, academy_id, user_id, total_rows, valid_rows):
    token = uuid.uuid4().hex
    cache.set(
        _preview_cache_key(token),
        {
            'dataset_type': dataset_type,
            'academy_id': academy_id,
            'user_id': user_id,
            'total_rows': total_rows,
            'valid_rows': valid_rows,
        },
        timeout=PREVIEW_TTL_SECONDS,
    )
    return token


def _load_preview_payload(token, dataset_type, academy_id, user_id):
    payload = cache.get(_preview_cache_key(token))
    if not payload:
        raise serializers.ValidationError({'preview_token': ['Preview expired or not found. Please upload the CSV again.']})
    if payload['dataset_type'] != dataset_type:
        raise serializers.ValidationError({'preview_token': ['Preview token does not match this dataset type.']})
    if payload['academy_id'] != academy_id or payload['user_id'] != user_id:
        raise serializers.ValidationError({'preview_token': ['Preview token does not belong to this academy session.']})
    return payload


def _preview_cache_key(token):
    return f'{PREVIEW_CACHE_PREFIX}:{token}'


def _get_dataset_parser(dataset_type):
    if dataset_type == 'students':
        return _preview_student_row
    return _preview_coach_row
