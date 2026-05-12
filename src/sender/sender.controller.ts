import { Body, Controller, Logger, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MessageDto, MessageResponseDto } from './dto';
import { SenderService } from './sender.service';

@Controller({ path: 'sender', version: '1' })
@ApiTags('Sender')
export class SenderController {
  private readonly logger = new Logger(SenderController.name);

  constructor(private readonly senderService: SenderService) { }

  @Post()
  @ApiOperation({
    summary: 'Publish a sender message event',
    description:
      'Validates the request body and publishes a sender event to the broker exchange.',
  })
  @ApiBody({
    type: MessageDto,
    description: 'Message payload that will be wrapped into a sender event',
    examples: {
      basic: {
        summary: 'Basic message payload',
        value: {
          userId: 123,
          text: 'Hello world',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Message event published successfully',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Request payload validation failed',
    schema: {
      example: {
        statusCode: 400,
        timestamp: '2026-05-12T14:22:19.286Z',
        path: '/v1/sender',
        message: ['userId must be a number conforming to the specified constraints'],
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'Broker publish failed after retries',
    schema: {
      example: {
        statusCode: 503,
        timestamp: '2026-05-12T14:22:29.411Z',
        path: '/v1/sender',
        message: 'Failed to publish message after 3 attempt(s)',
        errorCode: 'BROKER_PUBLISH_FAILED',
        details: {
          attempts: 3,
          cause: 'RabbitMQ connection is not established',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal server error',
    schema: {
      example: {
        statusCode: 500,
        timestamp: '2026-05-12T14:22:39.112Z',
        path: '/v1/sender',
        message: 'Internal server error',
      },
    },
  })
  async sendMessage(
    @Body() messageDto: MessageDto,
  ): Promise<MessageResponseDto> {
    this.logger.log(
      `Received send-message request for userId=${messageDto.userId}`,
    );

    const publishResult = await this.senderService.sendMessage(messageDto);

    this.logger.log(
      `Message eventId=${publishResult.eventId} published in ${publishResult.attempts} attempt(s)`,
    );

    return {
      status: 'success',
      message: 'Message sent successfully',
      eventId: publishResult.eventId,
      attempts: publishResult.attempts,
    };
  }
}
