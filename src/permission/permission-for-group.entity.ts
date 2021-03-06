import { Entity, PrimaryColumn, Index, ManyToOne, Column } from "typeorm";

import { PermissionObjectType } from "./permission-object-type.enum";
import { GroupEntity } from "@/group/group.entity";

@Entity("permission_for_group")
@Index(["objectId", "objectType", "groupId"])
export class PermissionForGroupEntity {
  @PrimaryColumn({ type: "integer" })
  objectId: number;

  @PrimaryColumn({ type: "enum", enum: PermissionObjectType })
  objectType: PermissionObjectType;

  @PrimaryColumn()
  @Index()
  groupId: number;

  @ManyToOne(type => GroupEntity, { onDelete: "CASCADE" })
  group: GroupEntity;

  // A number, larger means higher permission e.g. 1 for RO and 2 for RW
  @Column({ type: "integer" })
  permissionLevel: number;
}
