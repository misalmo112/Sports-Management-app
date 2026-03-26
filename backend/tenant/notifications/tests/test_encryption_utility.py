import os

from cryptography.fernet import Fernet
from django.test import TestCase

from shared.utils import encryption


class EncryptionUtilityTest(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.fernet_key = Fernet.generate_key().decode("utf-8")

    def setUp(self):
        os.environ["FERNET_SECRET_KEY"] = self.fernet_key
        # Ensure the module picks up the updated key per test run.
        encryption._FERNET_INSTANCE = None

    def test_encrypt_decrypt_roundtrip(self):
        plaintext = "hello world"
        ciphertext = encryption.encrypt_value(plaintext)
        decrypted = encryption.decrypt_value(ciphertext)
        self.assertEqual(decrypted, plaintext)

    def test_encrypt_value_output_is_not_plaintext(self):
        plaintext = "top-secret"
        ciphertext = encryption.encrypt_value(plaintext)
        self.assertNotEqual(ciphertext, plaintext)
        self.assertTrue(ciphertext)

    def test_encrypt_empty_string_passthrough(self):
        self.assertEqual(encryption.encrypt_value(""), "")

