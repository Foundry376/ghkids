import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";

@Entity({ name: "worlds" })
export class World {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "jsonb", nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  unsavedData: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  unsavedDataUpdatedAt: Date | null;

  @Column({ type: "text" })
  thumbnail: string;

  @Column({ type: "int8", default: 0 })
  playCount: number;

  @Column({ type: "int8", default: 0 })
  forkCount: number;

  @CreateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  updatedAt: Date;

  @ManyToOne(() => User, { persistence: false })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => World, { persistence: false, nullable: true })
  forkParent: World | null;

  @Column({ default: null })
  forkParentId: number | null;

  @Column({ type: "boolean", default: false })
  published: boolean;

  @Column({ type: "text", nullable: true })
  description: string | null;

  serialize(): any {
    return {
      name: this.name,
      id: this.id,
      userId: this.userId,
      playCount: Number(this.playCount),
      forkCount: Number(this.forkCount),
      forkParent: this.forkParent ? this.forkParent.serialize() : null,
      user: this.user ? this.user.serialize() : null,
      thumbnail: this.thumbnail ? this.thumbnail.toString() : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      published: this.published,
      description: this.description,
      unsavedDataUpdatedAt: this.unsavedDataUpdatedAt,
      hasUnsavedData: !!this.unsavedData,
    };
  }
}
