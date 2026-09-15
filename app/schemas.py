from pydantic import BaseModel, ConfigDict


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "trainee"


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str