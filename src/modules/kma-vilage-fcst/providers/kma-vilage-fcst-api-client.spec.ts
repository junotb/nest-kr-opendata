import { of, throwError } from 'rxjs';
import type { AxiosResponse } from 'axios';
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { KmaVilageFcstApiClient } from './kma-vilage-fcst-api-client';
import type { KmaVilageFcstRequestDto } from '../dtos/kma-vilage-fcst-request.dto';
import { KMA_API_SERVICE_KEY_ENV } from '../constants/kma-vilage-fcst.constants';
import type { KmaVilageFcstApiEnvelope } from '../types/kma-vilage-fcst.types';

function axiosResponse(
  data: KmaVilageFcstApiEnvelope,
): AxiosResponse<KmaVilageFcstApiEnvelope> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} as never },
  };
}

describe('KmaVilageFcstApiClient', () => {
  let client: KmaVilageFcstApiClient;
  let httpService: jest.Mocked<Pick<HttpService, 'get'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let request: KmaVilageFcstRequestDto;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-key'),
    };
    client = new KmaVilageFcstApiClient(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
    );

    request = {
      baseDate: '20260316',
      baseTime: '0200',
      nx: 60,
      ny: 127,
      pageNo: 1,
      numOfRows: 1000,
      dataType: 'JSON',
    };
  });

  it('JSON/XML 응답을 DTO로 변환하고 단일 item도 배열로 표준화한다', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        axiosResponse({
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
            body: {
              dataType: 'XML',
              pageNo: 1,
              numOfRows: 10,
              totalCount: 1,
              items: {
                item: {
                  baseDate: '20260316',
                  baseTime: '0200',
                  category: 'TMP',
                  fcstDate: '20260316',
                  fcstTime: '0300',
                  fcstValue: '6',
                  nx: 60,
                  ny: 127,
                },
              },
            },
          },
        }),
      ),
    );

    const result = await client.getVilageFcst(request);

    expect(configService.get).toHaveBeenCalledWith(KMA_API_SERVICE_KEY_ENV);
    expect(result.header).toEqual({
      resultCode: '00',
      resultMsg: 'NORMAL_SERVICE',
    });
    expect(result.body.dataType).toBe('XML');
    expect(result.body.items).toHaveLength(1);
    expect(result.body.items[0].category).toBe('TMP');
  });

  it('인증키 오류 코드(30/31)일 때 UnauthorizedException을 던진다', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        axiosResponse({
          response: {
            header: {
              resultCode: '30',
              resultMsg: 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR',
            },
            body: {
              dataType: 'JSON',
              pageNo: 1,
              numOfRows: 1,
              totalCount: 0,
              items: { item: [] },
            },
          },
        }),
      ),
    );

    await expect(client.getVilageFcst(request)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('네트워크 타임아웃 시 재시도 후 성공하면 결과를 반환한다', async () => {
    httpService.get
      .mockReturnValueOnce(throwError(() => ({ code: 'ETIMEDOUT' })))
      .mockReturnValueOnce(throwError(() => ({ code: 'ECONNRESET' })))
      .mockReturnValueOnce(
        of(
          axiosResponse({
            response: {
              header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
              body: {
                dataType: 'JSON',
                pageNo: 1,
                numOfRows: 1,
                totalCount: 1,
                items: {
                  item: [
                    {
                      baseDate: '20260316',
                      baseTime: '0200',
                      category: 'TMP',
                      fcstDate: '20260316',
                      fcstTime: '0300',
                      fcstValue: '6',
                      nx: 60,
                      ny: 127,
                    },
                  ],
                },
              },
            },
          }),
        ),
      );

    const result = await client.getVilageFcst(request);

    expect(httpService.get).toHaveBeenCalledTimes(3);
    expect(result.header.resultCode).toBe('00');
  });

  it('재시도 가능한 네트워크 오류가 반복되면 ServiceUnavailableException을 던진다', async () => {
    httpService.get.mockReturnValue(throwError(() => ({ code: 'ETIMEDOUT' })));

    await expect(client.getVilageFcst(request)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(httpService.get).toHaveBeenCalledTimes(3);
  });
});
