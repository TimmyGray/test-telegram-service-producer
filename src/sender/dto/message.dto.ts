import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MessageDto {
  @ApiProperty({
    description: 'User ID who sends the message',
    type: Number,
    minimum: 1,
    example: 123,
  })
  @IsNumber()
  @IsNotEmpty()
  userId!: number;

  @ApiProperty({
    description: 'Text content of the message',
    minLength: 1,
    example: 'Hello world',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}
