# Onboarding Wizard Contract

## Overview

This document defines the sequential onboarding wizard contract for the Sports Academy Management System. The onboarding wizard ensures all mandatory tenant reference data exists before normal operations can begin.

**Critical Rule**: If `Academy.onboarding_completed == False`, ALL tenant APIs except onboarding endpoints are blocked.

## Onboarding v2 (Activation + Checklist)

This system is split into two phases:

- **Phase A (Activation Wizard, hard-gated)**: a short, sequential wizard that collects the minimum required tenant reference data. Completion sets `Academy.onboarding_completed=True`.
- **Phase B (Guided Setup Checklist, soft-gated)**: post-activation setup items that improve “roster readiness” (members/staff/program setup). These items are recommended but **do not** block tenant APIs.

## Wizard Flow

The onboarding wizard is **strictly sequential** (linear progression):
- Step N+1 is only accessible after Step N is completed
- Steps cannot be skipped
- Steps can be revisited to update data
- Final validation occurs before marking `onboarding_completed=True`

### GET Onboarding State

**Endpoint**: `GET /api/v1/tenant/onboarding/state/`

**Purpose**: Return current onboarding progress and, for pre-fill, the academy's current profile (data collected at creation or from previous Step 1 submissions).

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "academy_id": "550e8400-e29b-41d4-a716-446655440000",
    "current_step": 1,
    "is_completed": false,
    "steps": { "step_1": { "name": "Academy Profile", "completed": false }, ... },
    "locked": false,
    "locked_by": null,
    "locked_at": null,
    "completed_at": null,
    "profile": {
      "name": "Elite Sports Academy",
      "email": "contact@elitesports.com",
      "phone": "",
      "website": "",
      "address_line1": "123 Sports Street",
      "address_line2": "",
      "city": "",
      "state": "",
      "postal_code": "",
      "country": "USA",
      "timezone": "America/New_York",
      "currency": "USD"
    }
  }
}
```

The `profile` object contains the academy's current Step 1 fields. Clients should use it to pre-fill the Step 1 form when the user has not yet completed that step.

## Wizard Steps

### Step 1: Academy Profile

**Purpose**: Collect basic academy information and contact details.

**Endpoint**: `POST /api/v1/tenant/onboarding/step/1/`

**Idempotency**: Endpoint is idempotent. Creates academy profile if missing, updates if exists.

**Unique Constraints**: 
- Academy is identified by `academy_id` from authenticated user's token
- Only one profile per academy (OneToOne relationship)

**Request Payload**:
```json
{
  "name": "Elite Sports Academy",
  "email": "contact@elitesports.com",
  "phone": "+1-555-0123",
  "website": "https://elitesports.com",
  "address_line1": "123 Sports Street",
  "address_line2": "Suite 100",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

**Field Validation**:
- `name`: Required, max 255 characters
- `email`: Required, valid email format
- `phone`: **Required**, max 20 characters. Allowed characters: digits, spaces, `+`, `-`, `(`, `)`. Must contain at least 8 digits (include country code, e.g. +1 555 123 4567).
- `website`: Optional, valid URL format
- `address_line1`: **Required**, max 255 characters
- `address_line2`: Optional, max 255 characters
- `city`: Optional, max 100 characters
- `state`: Optional, max 100 characters
- `postal_code`: Optional, max 20 characters
- `country`: Optional; when provided must be a 3-letter ISO alpha-3 code from the **global Country master**
- `timezone`: Required; must be a valid identifier from the **global Timezone master** (IANA)
- `currency`: Required; must be a 3-letter code from the **global Currency master**

**Success Response** (200 OK):
```json
{
  "status": "success",
  "step": 1,
  "message": "Academy profile saved successfully",
  "data": {
    "academy_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Elite Sports Academy",
    "email": "contact@elitesports.com",
    "completed": true
  },
  "next_step": 2
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "step": 1,
  "message": "Validation failed",
  "errors": {
    "name": ["This field is required."],
    "email": ["Enter a valid email address."],
    "timezone": ["Invalid timezone identifier."]
  }
}
```

**Step Completion Criteria**:
- All required fields are provided and valid
- Academy profile record is created/updated
- `OnboardingState.step_1_completed = True`
- `OnboardingState.current_step` is set to 2 (if step 1 was just completed)

**Upsert Behavior**:
- If profile exists: Update all provided fields
- If profile missing: Create new profile
- Never creates duplicates (enforced by OneToOne relationship)

---

### Step 2: Location

**Purpose**: Create at least one location (venue/facility) for the academy.

**Endpoint**: `POST /api/v1/tenant/onboarding/step/2/`

**Idempotency**: Endpoint is idempotent. Creates location if missing (by name), updates if exists.

**Unique Constraints**:
- Location identified by `academy_id` + `name` (unique together)
- At least one location must exist before proceeding

**Request Payload**:
```json
{
  "locations": [
    {
      "name": "Main Facility",
      "address_line1": "123 Sports Street",
      "address_line2": "Building A",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "United States",
      "phone": "+1-555-0123",
      "capacity": 200
    },
    {
      "name": "Training Center",
      "address_line1": "456 Training Ave",
      "city": "New York",
      "state": "NY",
      "postal_code": "10002",
      "country": "United States",
      "capacity": 100
    }
  ]
}
```

**Field Validation**:
- `locations`: Required, array with at least 1 item
- Each location:
  - `name`: Required, max 255 characters, unique per academy
  - `address_line1`: Optional, max 255 characters
  - `address_line2`: Optional, max 255 characters
  - `city`: Optional, max 100 characters
  - `state`: Optional, max 100 characters
  - `postal_code`: Optional, max 20 characters
  - `country`: Optional, max 100 characters
  - `phone`: Optional, max 20 characters
  - `capacity`: Optional, positive integer

**Success Response** (200 OK):
```json
{
  "status": "success",
  "step": 2,
  "message": "Locations saved successfully",
  "data": {
    "locations_created": 2,
    "locations_updated": 0,
    "total_locations": 2
  },
  "next_step": 3
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "step": 2,
  "message": "Validation failed",
  "errors": {
    "locations": ["At least one location is required."],
    "locations[0].name": ["This field is required."],
    "locations[1].name": ["A location with this name already exists."]
  }
}
```

**Step Completion Criteria**:
- At least one location is created/updated
- All location names are unique per academy
- `OnboardingState.step_2_completed = True`
- `OnboardingState.current_step` is set to 3 (if step 2 was just completed)

**Upsert Behavior**:
- Locations matched by `academy_id` + `name`
- If location exists: Update all provided fields
- If location missing: Create new location
- Duplicate names within same request are rejected

---

### Step 3: Sports

**Purpose**: Define at least one sport that the academy offers.

**Endpoint**: `POST /api/v1/tenant/onboarding/step/3/`

**Idempotency**: Endpoint is idempotent. Creates sport if missing (by name), updates if exists.

**Unique Constraints**:
- Sport identified by `academy_id` + `name` (unique together)
- At least one sport must exist before proceeding

**Request Payload**:
```json
{
  "sports": [
    {
      "name": "Soccer",
      "description": "Youth and adult soccer programs",
      "age_min": 5,
      "age_max": 18
    },
    {
      "name": "Basketball",
      "description": "Basketball training and leagues",
      "age_min": 6,
      "age_max": 16
    }
  ]
}
```

**Field Validation**:
- `sports`: Required, array with at least 1 item
- Each sport:
  - `name`: Required, max 255 characters, unique per academy
  - `description`: Optional, text field
  - `age_min`: Optional, integer >= 0
  - `age_max`: Optional, integer > age_min (if both provided)

**Success Response** (200 OK):
```json
{
  "status": "success",
  "step": 3,
  "message": "Sports saved successfully",
  "data": {
    "sports_created": 2,
    "sports_updated": 0,
    "total_sports": 2
  },
  "next_step": 4
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "step": 3,
  "message": "Validation failed",
  "errors": {
    "sports": ["At least one sport is required."],
    "sports[0].name": ["This field is required."],
    "sports[1].age_max": ["Age max must be greater than age min."]
  }
}
```

**Step Completion Criteria**:
- At least one sport is created/updated
- All sport names are unique per academy
- `OnboardingState.step_3_completed = True`
- `OnboardingState.current_step` is set to 4 (if step 3 was just completed)

**Upsert Behavior**:
- Sports matched by `academy_id` + `name`
- If sport exists: Update all provided fields
- If sport missing: Create new sport
- Duplicate names within same request are rejected

---

### Step 4: Terms

**Purpose**: Define at least one term (semester/period) for organizing classes and enrollments.

**Endpoint**: `POST /api/v1/tenant/onboarding/step/4/`

**Idempotency**: Endpoint is idempotent. Creates term if missing (by name + start_date), updates if exists.

**Unique Constraints**:
- Term identified by `academy_id` + `name` + `start_date` (unique together)
- At least one term must exist before proceeding

**Request Payload**:
```json
{
  "terms": [
    {
      "name": "Fall 2024",
      "start_date": "2024-09-01",
      "end_date": "2024-12-15",
      "description": "Fall semester 2024"
    },
    {
      "name": "Spring 2025",
      "start_date": "2025-01-15",
      "end_date": "2025-05-30",
      "description": "Spring semester 2025"
    }
  ]
}
```

**Field Validation**:
- `terms`: Required, array with at least 1 item
- Each term:
  - `name`: Required, max 255 characters
  - `start_date`: Required, valid date (ISO 8601 format: YYYY-MM-DD)
  - `end_date`: Required, valid date, must be after start_date
  - `description`: Optional, text field

**Success Response** (200 OK):
```json
{
  "status": "success",
  "step": 4,
  "message": "Terms saved successfully",
  "data": {
    "terms_created": 2,
    "terms_updated": 0,
    "total_terms": 2
  },
  "next_step": 5
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "step": 4,
  "message": "Validation failed",
  "errors": {
    "terms": ["At least one term is required."],
    "terms[0].start_date": ["This field is required."],
    "terms[1].end_date": ["End date must be after start date."]
  }
}
```

**Step Completion Criteria**:
- At least one term is created/updated
- All term date ranges are valid (end_date > start_date)
- `OnboardingState.step_4_completed = True`
- `OnboardingState.current_step` is set to 5 (if step 4 was just completed)

**Upsert Behavior**:
- Terms matched by `academy_id` + `name` + `start_date`
- If term exists: Update all provided fields
- If term missing: Create new term
- Duplicate name+start_date combinations within same request are rejected

---

### Step 5: Pricing

**Purpose**: Define pricing items and durations for classes and programs.

**Endpoint**: `POST /api/v1/tenant/onboarding/step/5/`

**Idempotency**: Endpoint is idempotent. Creates pricing item if missing (by name + duration_type), updates if exists.

**Unique Constraints**:
- Pricing item identified by `academy_id` + `name` + `duration_type` (unique together)
- At least one pricing item must exist before proceeding

**Request Payload**:
```json
{
  "pricing_items": [
    {
      "name": "Monthly Membership",
      "description": "Monthly unlimited classes",
      "duration_type": "MONTHLY",
      "duration_value": 1,
      "price": 99.99,
      "currency": "USD"
    },
    {
      "name": "Drop-in Class",
      "description": "Single class session",
      "duration_type": "SESSION",
      "duration_value": 1,
      "price": 15.00,
      "currency": "USD"
    },
    {
      "name": "10-Class Pack",
      "description": "Pack of 10 classes",
      "duration_type": "SESSION",
      "duration_value": 10,
      "price": 120.00,
      "currency": "USD"
    }
  ]
}
```

**Field Validation**:
- `pricing_items`: Required, array with at least 1 item
- Each pricing item:
  - `name`: Required, max 255 characters
  - `description`: Optional, text field
  - `duration_type`: Required, one of: `MONTHLY`, `WEEKLY`, `SESSION`, `CUSTOM`
  - `duration_value`: Required, positive integer
  - `price`: Required, decimal >= 0, max 2 decimal places
  - `currency`: Required, 3-character ISO currency code (default: "USD")

**Success Response** (200 OK):
```json
{
  "status": "success",
  "step": 5,
  "message": "Pricing items saved successfully",
  "data": {
    "pricing_items_created": 3,
    "pricing_items_updated": 0,
    "total_pricing_items": 3
  },
  "next_step": null,
  "onboarding_complete": true
}
```

**Error Response** (400 Bad Request):
```json
{
  "status": "error",
  "step": 5,
  "message": "Validation failed",
  "errors": {
    "pricing_items": ["At least one pricing item is required."],
    "pricing_items[0].duration_type": ["Invalid duration type. Must be one of: MONTHLY, WEEKLY, SESSION, CUSTOM."],
    "pricing_items[1].price": ["Price must be a positive number."]
  }
}
```

**Step Completion Criteria**:
- At least one pricing item is created/updated
- All pricing items have valid duration types and prices
- `OnboardingState.step_5_completed = True`
- Final validation passes (all steps 1-6 completed)
- `Academy.onboarding_completed = True`
- `OnboardingState.is_completed = True`
- `OnboardingState.completed_by_user` and `completed_at` are set

**Upsert Behavior**:
- Pricing items matched by `academy_id` + `name` + `duration_type`
- If pricing item exists: Update all provided fields
- If pricing item missing: Create new pricing item
- Duplicate name+duration_type combinations within same request are rejected

---

## Onboarding Status Endpoint

**Purpose**: Get current onboarding status and progress.

**Endpoint**: `GET /api/v1/tenant/onboarding/status/`

**Success Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "academy_id": "550e8400-e29b-41d4-a716-446655440000",
    "current_step": 3,
    "is_completed": false,
    "steps": {
      "step_1": {
        "name": "Academy Profile",
        "completed": true
      },
      "step_2": {
        "name": "Location",
        "completed": true
      },
      "step_3": {
        "name": "Sports",
        "completed": false
      },
      "step_4": {
        "name": "Age Categories",
        "completed": false
      },
      "step_5": {
        "name": "Terms",
        "completed": false
      },
      "step_6": {
        "name": "Pricing",
        "completed": false
      }
    },
    "locked": false,
    "locked_by": null
  }
}
```

---

## Concurrency Control

### Locking Mechanism

To prevent multiple admins from running the wizard simultaneously:

1. **Acquire Lock**: When a user starts the wizard, set `OnboardingState.locked_by = user` and `locked_at = now()`
2. **Check Lock**: Before processing any step, verify lock is held by current user or expired
3. **Release Lock**: Lock is released when:
   - Onboarding is completed
   - User explicitly releases lock (timeout or manual release)
   - Lock expires (e.g., 30 minutes of inactivity)

**Lock Timeout**: 30 minutes of inactivity

**Endpoint**: `POST /api/v1/tenant/onboarding/lock/` (acquire) and `DELETE /api/v1/tenant/onboarding/lock/` (release)

**Error Response** (409 Conflict) - Lock held by another user:
```json
{
  "status": "error",
  "message": "Onboarding wizard is locked by another user",
  "locked_by": "admin@academy.com",
  "locked_at": "2024-01-15T10:30:00Z"
}
```

---

## Final Validation

Before marking `onboarding_completed=True`, the system validates:

1. ✅ Academy profile exists and is complete
2. ✅ At least one location exists
3. ✅ At least one sport exists
4. ✅ At least one term exists
5. ✅ At least one pricing item exists
6. ✅ All steps are marked as completed in `OnboardingState`

If validation fails, return error with missing requirements:
```json
{
  "status": "error",
  "message": "Onboarding validation failed",
  "missing_requirements": [
    "At least one location is required",
    "At least one sport is required"
  ]
}
```

---

## Error Handling

### Common Error Responses

**403 Forbidden** - Onboarding not completed (blocking tenant APIs):
```json
{
  "detail": "Onboarding not completed",
  "required_steps": ["location", "sport", "term", "pricing"]
}
```

**409 Conflict** - Wizard locked by another user:
```json
{
  "status": "error",
  "message": "Onboarding wizard is locked by another user",
  "locked_by": "admin@academy.com",
  "locked_at": "2024-01-15T10:30:00Z"
}
```

**400 Bad Request** - Validation errors (see step-specific examples above)

**404 Not Found** - Academy not found:
```json
{
  "detail": "Academy not found"
}
```

---

## Idempotency Guarantees

All onboarding step endpoints are **idempotent**:

1. **Safe to Retry**: Same request can be sent multiple times without side effects
2. **Upsert Behavior**: Creates if missing, updates if exists
3. **No Duplicates**: Unique constraints prevent duplicate records
4. **Consistent State**: Final state is same regardless of number of requests

**Implementation Pattern**:
```python
# Pseudo-code for idempotent endpoint
def create_or_update_location(academy, location_data):
    location, created = Location.objects.update_or_create(
        academy=academy,
        name=location_data['name'],
        defaults=location_data
    )
    return location, created
```

---

## Best Practices

1. **Validate Early**: Validate all fields before creating/updating records
2. **Atomic Operations**: Use database transactions for multi-record operations
3. **Clear Errors**: Provide specific field-level error messages
4. **Progress Tracking**: Update `OnboardingState` after each successful step
5. **Lock Management**: Always check and manage locks for concurrency
6. **Final Validation**: Validate all requirements before completion
7. **Idempotency**: Ensure all endpoints are safe to retry
8. **Unique Constraints**: Use database-level unique constraints to prevent duplicates
