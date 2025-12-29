import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user";

@Entity({ name: "worlds" })
export class World {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text", nullable: true })
  data: string | null;

  @Column({ type: "text" })
  thumbnail: string;

  @Column({ type: "int8", default: 0 })
  playCount: number;

  @Column({ type: "int8", default: 0 })
  forkCount: number;

  @CreateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  createdAt: Date;

  @CreateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  updatedAt: Date;

  @ManyToOne(() => User, { persistence: false })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => World, { persistence: false, nullable: true })
  forkParent: World | null;

  @Column({ default: null })
  forkParentId: number | null;

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
    };
  }
}
