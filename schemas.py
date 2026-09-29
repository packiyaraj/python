"""Pydantic schemas for validating API input and output."""

from pydantic import BaseModel, Field, model_validator


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(ge=0)


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        if "name" in self.model_fields_set and self.name is None:
            raise ValueError("name cannot be null")
        if "price" in self.model_fields_set and self.price is None:
            raise ValueError("price cannot be null")
        return self


class ItemResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    price: float
