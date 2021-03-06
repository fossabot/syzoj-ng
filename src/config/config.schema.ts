import { ValidateNested, IsIP, IsString, IsIn, IsBoolean, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsPortNumber } from "@/common/validators";

class ServerConfig {
  @IsIP()
  readonly hostname: string;

  @IsPortNumber()
  readonly port: number;
}

class DatabaseConfig {
  @IsIn(["mysql", "mariadb"])
  readonly type: "mysql" | "mariadb";

  @IsString()
  readonly host: string;

  @IsPortNumber()
  readonly port: number;

  @IsString()
  readonly username: string;

  @IsString()
  readonly password: string;

  @IsString()
  readonly database: string;
}

class MinioConfig {
  @IsString()
  readonly endPoint: string;

  @IsPortNumber()
  readonly port: number;

  @IsBoolean()
  readonly useSSL: boolean;

  @IsString()
  readonly accessKey: string;

  @IsString()
  readonly secretKey: string;

  @IsString()
  readonly bucket: string;
}

class ServicesConfig {
  @ValidateNested()
  @Type(() => DatabaseConfig)
  readonly database: DatabaseConfig;

  @ValidateNested()
  @Type(() => MinioConfig)
  readonly minio: MinioConfig;

  @IsString()
  readonly redis: string;
}

class CrossOriginConfig {
  @IsBoolean()
  readonly enabled: boolean;

  @IsString({
    each: true
  })
  readonly whiteList: string[];
}

class SecurityConfig {
  @IsString()
  readonly sessionSecret: string;

  @ValidateNested()
  @Type(() => CrossOriginConfig)
  readonly crossOrigin: CrossOriginConfig;
}

class PreferenceConfig {
  @IsBoolean()
  readonly allowUserChangeUsername: boolean;

  @IsBoolean()
  readonly allowOwnerManageProblemPermission: boolean;

  @IsBoolean()
  readonly allowOwnerDeleteProblem: boolean;
}

class QueryLimitConfig {
  @IsInt()
  @Min(0)
  readonly problemSetProblemsTake: number;

  @IsInt()
  @Min(0)
  readonly searchUserTake: number;

  @IsInt()
  @Min(0)
  readonly searchGroupTake: number;
}

export class AppConfig {
  @ValidateNested()
  @Type(() => ServerConfig)
  readonly server: ServerConfig;

  @ValidateNested()
  @Type(() => ServicesConfig)
  readonly services: ServicesConfig;

  @ValidateNested()
  @Type(() => SecurityConfig)
  readonly security: SecurityConfig;

  @ValidateNested()
  @Type(() => PreferenceConfig)
  readonly preference: PreferenceConfig;

  @ValidateNested()
  @Type(() => QueryLimitConfig)
  readonly queryLimit: QueryLimitConfig;
}
