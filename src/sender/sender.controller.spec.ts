import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SenderController } from './sender.controller';
import { MessageDto } from './dto';
import { SenderService } from './sender.service';

describe('SenderController', () => {
  let senderController: SenderController;
  let senderService: { sendMessage: jest.Mock };

  beforeEach(async () => {
    senderService = {
      sendMessage: jest.fn(() =>
        Promise.resolve({
          eventId: '43ed5f22-1301-4fa8-bf7f-7f57f129972f',
          confirmed: true,
          attempts: 1,
        }),
      ),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [SenderController],
      providers: [
        {
          provide: SenderService,
          useValue: senderService,
        },
      ],
    }).compile();

    senderController = app.get<SenderController>(SenderController);
  });

  describe('sendMessage', () => {
    it('should return a success response', async () => {
      const payload: MessageDto = {
        userId: 123,
        text: 'Hello world',
      };

      const result = await senderController.sendMessage(payload);

      expect(result).toEqual({
        status: 'success',
        message: 'Message sent successfully',
        eventId: '43ed5f22-1301-4fa8-bf7f-7f57f129972f',
        attempts: 1,
      });
      expect(senderService.sendMessage).toHaveBeenCalledTimes(1);
      expect(senderService.sendMessage).toHaveBeenCalledWith(payload);
    });
  });
});
