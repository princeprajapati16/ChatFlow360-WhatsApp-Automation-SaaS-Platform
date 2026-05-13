import uuid
import secrets
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from chatflow360.models import BaseModel

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        USER = 'USER', 'User'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('email address', unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Store API key hash. For simple use-case without DB heavy search
    api_key_hash = models.CharField(max_length=128, blank=True, null=True, help_text="Stored hashed api key")
    api_key_prefix = models.CharField(max_length=20, blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    def generate_api_key(self):
        from django.conf import settings
        import hashlib
        
        prefix = getattr(settings, 'API_KEY_PREFIX', 'cf360')
        raw_key = secrets.token_urlsafe(32)
        full_key = f"{prefix}_{raw_key}"
        
        # Hash to store
        hashed = hashlib.sha256(full_key.encode()).hexdigest()
        self.api_key_hash = hashed
        self.api_key_prefix = prefix
        self.save(update_fields=['api_key_hash', 'api_key_prefix'])
        
        # Return full plain key only once
        return full_key
