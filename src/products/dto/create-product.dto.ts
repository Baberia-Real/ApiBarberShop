// dtos/create-product.dto.ts
import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO principal para crear producto
export class CreateProductDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => Number(value))
  categoryId: number;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  price: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Transform(({ value }) => Number(value))
  salePrice?: number;

  @IsString()
  @Transform(({ value }) => value?.trim())
  size: string;

  @IsString()
  @Transform(({ value }) => value?.trim())
  color: string;

}
