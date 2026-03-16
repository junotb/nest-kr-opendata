import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  KMA_API_SERVICE_KEY_ENV,
  KMA_VILAGE_FCST_ENDPOINT,
} from '../constants/kma-vilage-fcst.constants';
import { KmaVilageFcstRequestDto } from '../dtos/kma-vilage-fcst-request.dto';
import { KmaVilageFcstResponseDto } from '../dtos/kma-vilage-fcst-response.dto';
import type { KmaVilageFcstApiEnvelope } from '../types/kma-vilage-fcst.types';

/**
 * 기상청 단기예보 OpenAPI 호출을 담당하는 인프라 클라이언트.
 * 네트워크 재시도와 인증 오류 매핑을 포함한다.
 */
@Injectable()
export class KmaVilageFcstApiClient {
  private readonly endpoint = KMA_VILAGE_FCST_ENDPOINT;
  private readonly retryCount = 2;
  private readonly authErrorCodes = new Set(['30', '31']);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 단기예보 API를 호출하고 공통 응답 DTO로 정규화해 반환한다.
   *
   * @throws UnauthorizedException 인증키 오류(resultCode: 30, 31)일 때
   * @throws ServiceUnavailableException 재시도 후에도 네트워크 오류일 때
   */
  async getVilageFcst(
    request: KmaVilageFcstRequestDto,
  ): Promise<KmaVilageFcstResponseDto> {
    const serviceKey = this.configService.get<string>(KMA_API_SERVICE_KEY_ENV);

    const { data } = await this.requestWithRetry({
      params: {
        serviceKey,
        pageNo: request.pageNo,
        numOfRows: request.numOfRows,
        dataType: request.dataType,
        base_date: request.baseDate,
        base_time: request.baseTime,
        nx: request.nx,
        ny: request.ny,
      },
    });

    const apiResponse = data?.response;
    const header = apiResponse?.header;
    const body = apiResponse?.body;
    const items = body?.items?.item;
    const resultCode = header?.resultCode ?? '';

    if (this.authErrorCodes.has(resultCode)) {
      throw new UnauthorizedException({
        resultCode,
        resultMsg: header?.resultMsg ?? 'API 인증키 오류',
      });
    }

    return {
      header: {
        resultCode,
        resultMsg: header?.resultMsg ?? '',
      },
      body: {
        dataType: body?.dataType ?? request.dataType,
        pageNo: body?.pageNo ?? request.pageNo,
        numOfRows: body?.numOfRows ?? request.numOfRows,
        totalCount: body?.totalCount ?? 0,
        items: Array.isArray(items) ? items : items ? [items] : [],
      },
      raw: data,
    };
  }

  /**
   * 재시도 가능한 네트워크 오류에 대해 최대 `retryCount`만큼 재시도한다.
   */
  private async requestWithRetry(options: {
    params: Record<string, unknown>;
  }): Promise<{ data: KmaVilageFcstApiEnvelope }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      try {
        return await firstValueFrom(
          this.httpService.get<KmaVilageFcstApiEnvelope>(
            this.endpoint,
            options,
          ),
        );
      } catch (error) {
        lastError = error;
        if (!this.isRetryableError(error) || attempt === this.retryCount) {
          break;
        }
      }
    }

    throw new ServiceUnavailableException({
      message: '기상청 API 호출에 실패했습니다.',
      cause: lastError instanceof Error ? lastError.message : String(lastError),
    });
  }

  /** 네트워크 계층에서 재시도 가능한 오류 코드를 판별한다. */
  private isRetryableError(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    return (
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN'
    );
  }
}
