import { Controller, Get, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";

import {
  LoginRequestDto,
  RegisterRequestDto,
  GetSelfMetaResponseDto,
  LoginResponseDto,
  LoginResponseError,
  RegisterResponseDto,
  RegisterResponseError
} from "./dto";
import { ConfigService } from "@/config/config.service";
import { AuthService } from "./auth.service";
import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {}

  @Get("getSelfMeta")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the metadata of the current logged-in user."
  })
  async getSelfMeta(
    @CurrentUser() currentUser: UserEntity
  ): Promise<GetSelfMetaResponseDto> {
    const result: GetSelfMetaResponseDto = new GetSelfMetaResponseDto();
    if (currentUser) {
      result.userMeta = {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        bio: currentUser.bio,
        isAdmin: currentUser.isAdmin
      };
    } else {
      result.userMeta = null;
    }

    return result;
  }

  @Post("login")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Login with given credentials.",
    description: "Return the logged-in user's metadata and token if success."
  })
  async login(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: LoginRequestDto
  ): Promise<LoginResponseDto> {
    if (currentUser)
      return {
        error: LoginResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.login(
      request.username,
      request.password
    );

    if (error)
      return {
        error: error
      };

    return {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        isAdmin: user.isAdmin
      },
      token: jwt.sign(
        user.id.toString(),
        this.configService.config.security.sessionSecret
      )
    };
  }

  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Logout the current session."
  })
  async logout(): Promise<object> {
    return {};
  }

  @Post("register")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Register then login.",
    description: "Return the new user's metadata and token if success."
  })
  async register(
    @CurrentUser() currentUser: UserEntity,
    @Body() request: RegisterRequestDto
  ): Promise<RegisterResponseDto> {
    if (currentUser)
      return {
        error: RegisterResponseError.ALREADY_LOGGEDIN
      };

    const [error, user] = await this.authService.register(
      request.username,
      request.email,
      request.password
    );

    if (error)
      return {
        error: error
      };

    return {
      userMeta: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        isAdmin: user.isAdmin
      },
      token: jwt.sign(
        user.id.toString(),
        this.configService.config.security.sessionSecret
      )
    };
  }
}