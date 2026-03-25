import os


class XeroNotConfiguredError(Exception):
    """Raised when Xero credentials are missing from environment variables."""


class XeroClient:
    """
    Thin wrapper around Xero integration.

    This project currently does not implement the real OAuth2 flow; `create_invoice`
    is intentionally unimplemented.
    """

    def __init__(self) -> None:
        client_id = os.getenv("XERO_CLIENT_ID")
        client_secret = os.getenv("XERO_CLIENT_SECRET")

        missing = []
        if not client_id:
            missing.append("XERO_CLIENT_ID")
        if not client_secret:
            missing.append("XERO_CLIENT_SECRET")

        if missing:
            raise XeroNotConfiguredError(f"Missing Xero env var(s): {', '.join(missing)}")

        self.client_id = client_id
        self.client_secret = client_secret

    def create_invoice(self, payment):
        raise NotImplementedError("Xero OAuth2 client not yet implemented.")

