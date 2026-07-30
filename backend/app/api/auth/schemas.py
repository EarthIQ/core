from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class PermissionRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    is_superuser: bool = False
    groups: list[str] = Field(default_factory=list)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    groups: Optional[list[str]] = None


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserAdminRead(UserRead):
    groups: list["GroupRead"] = Field(default_factory=list)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GroupRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    permissions: list[PermissionRead] = Field(default_factory=list)
    users: list[UserRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: list[str] = Field(default_factory=list)
    user_ids: list[str] = Field(default_factory=list)


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[list[str]] = None
    user_ids: Optional[list[str]] = None


class PermissionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


UserAdminRead.model_rebuild()

