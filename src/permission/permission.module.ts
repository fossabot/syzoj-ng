import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PermissionService } from "./permission.service";
import { PermissionForUserEntity } from "./permission-for-user.entity";
import { PermissionForGroupEntity } from "./permission-for-group.entity";
import { GroupModule } from "@/group/group.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionForUserEntity]),
    TypeOrmModule.forFeature([PermissionForGroupEntity]),
    GroupModule
  ],
  providers: [PermissionService],
  exports: [PermissionService]
})
export class PermissionModule {}
