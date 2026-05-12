import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Status of the message sending operation',
    enum: ['success'],
    example: 'success',
  })
  status!: string;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Message sent successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Unique event identifier for idempotency and tracing',
    format: 'uuid',
    example: 'f51f4a93-f5c3-48ea-a3e4-2f2aef867fb8',
  })
  eventId!: string;

  @ApiProperty({
    description: 'Number of publish attempts needed before confirmation',
    type: Number,
    example: 1,
  })
  attempts!: number;
}
