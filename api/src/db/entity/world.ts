import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user";
import { WorldVersion } from "./world-version";

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

  // What players get: a frozen copy made when the author last published. A game
  // is published exactly when this is set.
  @ManyToOne(() => WorldVersion, { persistence: false, nullable: true, onDelete: "SET NULL" })
  publishedVersion: WorldVersion | null;

  @Column({ type: "int", nullable: true })
  publishedVersionId: number | null;

  // Superseded by publishedVersionId. Still written, so it stays right if the
  // API is rolled back to a version that reads it.
  @Column({ type: "boolean", default: false })
  published: boolean;

  @Column({ type: "text", nullable: true })
  description: string | null;

  isPublished() {
    return this.publishedVersionId != null;
  }

  /**
   * With `asPublished`, the title, description and picture come from the
   * published version (when it's loaded) instead of the author's working copy.
   */
  serialize(asPublished = false): any {
    const shown = asPublished && this.publishedVersion ? this.publishedVersion : this;
    return {
      name: shown.name,
      id: this.id,
      userId: this.userId,
      playCount: Number(this.playCount),
      forkCount: Number(this.forkCount),
      forkParent: this.forkParent ? this.forkParent.serialize(true) : null,
      user: this.user ? this.user.serialize() : null,
      thumbnail: shown.thumbnail ? shown.thumbnail.toString() : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      published: this.isPublished(),
      publishedAt: this.publishedVersion?.createdAt ?? null,
      description: shown.description,
      unsavedDataUpdatedAt: this.unsavedDataUpdatedAt,
      hasUnsavedData: !!this.unsavedData,
    };
  }
}
