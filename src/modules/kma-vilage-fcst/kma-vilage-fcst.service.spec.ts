import { KmaVilageFcstService } from './kma-vilage-fcst.service';
import { KmaVilageFcstApiClient } from './providers/kma-vilage-fcst-api-client';
import type { KmaVilageFcstRequestDto } from './dtos/kma-vilage-fcst-request.dto';
import type { KmaVilageFcstResponseDto } from './dtos/kma-vilage-fcst-response.dto';
import { BadRequestException } from '@nestjs/common';
import {
  KMA_DEFAULT_DATA_TYPE,
  KMA_DEFAULT_NUM_OF_ROWS,
  KMA_DEFAULT_NX,
  KMA_DEFAULT_NY,
  KMA_DEFAULT_PAGE_NO,
} from './constants/kma-vilage-fcst.constants';

describe('KmaVilageFcstService', () => {
  let service: KmaVilageFcstService;
  let apiClient: jest.Mocked<Pick<KmaVilageFcstApiClient, 'getVilageFcst'>>;
  let rawEventRepository: {
    upsert: jest.Mock;
    deleteExpired: jest.Mock;
  };
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    apiClient = {
      getVilageFcst: jest.fn(),
    };
    rawEventRepository = {
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteExpired: jest.fn().mockResolvedValue(0),
    };
    service = new KmaVilageFcstService(
      apiClient as unknown as KmaVilageFcstApiClient,
      rawEventRepository,
    );
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('calculateBaseDateTime', () => {
    it('KST 02:15일 때 당일 02:00 발표를 사용한다', () => {
      const now = new Date('2026-03-15T17:15:00.000Z');

      const result = service.calculateBaseDateTime(now);

      expect(result).toEqual({
        baseDate: '20260316',
        baseTime: '0200',
      });
    });

    it('KST 02:05일 때 전일 23:00 발표를 사용한다', () => {
      const now = new Date('2026-03-15T17:05:00.000Z');

      const result = service.calculateBaseDateTime(now);

      expect(result).toEqual({
        baseDate: '20260315',
        baseTime: '2300',
      });
    });
  });

  describe('convertToGrid', () => {
    it('기상청 가이드 예시 좌표와 동일한 NX/NY를 반환한다', () => {
      const result = service.convertToGrid(
        37.579871128849334,
        126.98935225645432,
      );

      expect(result).toEqual({ nx: 60, ny: 127 });
    });
  });

  describe('getForecast', () => {
    it('API 클라이언트 결과를 DTO 형태로 그대로 반환한다(JSON/XML 공통)', async () => {
      const request = {
        baseDate: '20260316',
        baseTime: '0200',
        nx: 60,
        ny: 127,
        pageNo: 1,
        numOfRows: 1000,
        dataType: 'XML',
      } as KmaVilageFcstRequestDto;

      const mockResponse: KmaVilageFcstResponseDto = {
        header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
        body: {
          dataType: 'XML',
          pageNo: 1,
          numOfRows: 1000,
          totalCount: 1,
          items: [
            {
              baseDate: '20260316',
              baseTime: '0200',
              category: 'TMP',
              fcstDate: '20260316',
              fcstTime: '0300',
              fcstValue: '5',
              nx: 60,
              ny: 127,
            },
          ],
        },
      };
      apiClient.getVilageFcst.mockResolvedValue(mockResponse);

      const result = await service.getForecast(request);

      expect(apiClient.getVilageFcst).toHaveBeenCalledWith(request);
      expect(result).toEqual(mockResponse);
      expect(rawEventRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'kma',
          endpoint: 'vilage-fcst',
          isSuccess: true,
          baseDate: request.baseDate,
          baseTime: request.baseTime,
          nx: request.nx,
          ny: request.ny,
        }),
      );
    });

    it('운영 환경에서 필수 파라미터 누락 시 BadRequestException을 던진다', async () => {
      process.env.NODE_ENV = 'production';

      await expect(
        service.getForecast({
          pageNo: 1,
          numOfRows: 10,
          dataType: 'JSON',
        } as KmaVilageFcstRequestDto),
      ).rejects.toThrow(BadRequestException);

      expect(apiClient.getVilageFcst).not.toHaveBeenCalled();
      expect(rawEventRepository.upsert).not.toHaveBeenCalled();
    });

    it('비운영 환경에서 필수 파라미터 누락 시 현재 시각과 서울 격자를 기본값으로 사용한다', async () => {
      process.env.NODE_ENV = 'development';
      jest.spyOn(service, 'calculateBaseDateTime').mockReturnValue({
        baseDate: '20260316',
        baseTime: '0200',
      });

      const mockResponse: KmaVilageFcstResponseDto = {
        header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
        body: {
          dataType: 'JSON',
          pageNo: 1,
          numOfRows: 1000,
          totalCount: 0,
          items: [],
        },
      };
      apiClient.getVilageFcst.mockResolvedValue(mockResponse);

      await service.getForecast({} as KmaVilageFcstRequestDto);

      expect(apiClient.getVilageFcst).toHaveBeenCalledWith({
        baseDate: '20260316',
        baseTime: '0200',
        nx: KMA_DEFAULT_NX,
        ny: KMA_DEFAULT_NY,
        pageNo: KMA_DEFAULT_PAGE_NO,
        numOfRows: KMA_DEFAULT_NUM_OF_ROWS,
        dataType: KMA_DEFAULT_DATA_TYPE,
      });
    });

    it('API 호출 실패 시에도 실패 원문을 저장한 뒤 예외를 그대로 전달한다', async () => {
      apiClient.getVilageFcst.mockRejectedValue(new Error('network error'));

      await expect(
        service.getForecast({
          baseDate: '20260316',
          baseTime: '0200',
          nx: 60,
          ny: 127,
        } as KmaVilageFcstRequestDto),
      ).rejects.toThrow('network error');

      expect(rawEventRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'kma',
          endpoint: 'vilage-fcst',
          isSuccess: false,
          statusCode: null,
          responseRaw: expect.stringContaining('network error'),
        }),
      );
    });
  });
});
