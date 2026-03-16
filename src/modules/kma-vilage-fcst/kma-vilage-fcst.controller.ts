import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  KMA_VILAGE_FCST_CONTROLLER_PATH,
  KMA_VILAGE_FCST_FORECAST_PATH,
} from './constants/kma-vilage-fcst.constants';
import { KmaVilageFcstRequestDto } from './dtos/kma-vilage-fcst-request.dto';
import { KmaVilageFcstResponseDto } from './dtos/kma-vilage-fcst-response.dto';
import { KmaVilageFcstService } from './kma-vilage-fcst.service';

@ApiTags('kma-vilage-fcst')
@Controller(KMA_VILAGE_FCST_CONTROLLER_PATH)
export class KmaVilageFcstController {
  constructor(private readonly kmaVilageFcstService: KmaVilageFcstService) {}

  @ApiOperation({
    summary: '기상청 단기예보 조회',
    description:
      '기상청 단기예보 API를 호출해 결과를 반환합니다. 운영 환경에서는 baseDate/baseTime/nx/ny 파라미터가 필수입니다.',
  })
  @ApiOkResponse({
    description: '단기예보 조회 성공',
    type: KmaVilageFcstResponseDto,
  })
  @ApiBadRequestResponse({
    description: '요청 파라미터 오류',
    type: BadRequestException,
  })
  @ApiUnauthorizedResponse({
    description: '외부 API 인증키 오류',
    type: UnauthorizedException,
  })
  @ApiServiceUnavailableResponse({
    description: '외부 API 호출 실패',
    type: ServiceUnavailableException,
  })
  @Get(KMA_VILAGE_FCST_FORECAST_PATH)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  getForecast(
    @Query() request: KmaVilageFcstRequestDto,
  ): Promise<KmaVilageFcstResponseDto> {
    return this.kmaVilageFcstService.getForecast(request);
  }
}
