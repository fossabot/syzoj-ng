import { ApiProperty } from "@nestjs/swagger";
import { Length, IsIn, IsOptional } from "class-validator";

export class SearchGroupRequestDto {
  @ApiProperty()
  @Length(1, 48)
  readonly query: string;

  @ApiProperty({ enum: ["START", "END", "BOTH"] })
  @IsIn(["START", "END", "BOTH"])
  @IsOptional()
  readonly wildcard?: "START" | "END" | "BOTH";
}
