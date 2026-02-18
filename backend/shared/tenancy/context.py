"""Thread-local schema context for tenant routing."""

from threading import local

_state = local()


def set_current_schema(schema_name):
    _state.schema_name = schema_name


def get_current_schema():
    return getattr(_state, 'schema_name', None)


def set_dual_write_disabled(disabled=True):
    _state.dual_write_disabled = bool(disabled)


def is_dual_write_disabled():
    return getattr(_state, 'dual_write_disabled', False)


def clear_tenancy_context():
    if hasattr(_state, 'schema_name'):
        delattr(_state, 'schema_name')
    if hasattr(_state, 'dual_write_disabled'):
        delattr(_state, 'dual_write_disabled')
