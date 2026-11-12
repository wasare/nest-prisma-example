import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Mesmos campos do CreateProductDto, porém todos opcionais.
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
