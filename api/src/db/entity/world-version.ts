import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { World } from "./world";

/**
 * A frozen copy of a game. Publishing makes one and points the world's
 * publishedVersionId at it, so players keep getting it while the author goes
 * on saving. The only change ever made to one is the author editing the live
 * version's title and description from the play page.
 */
@Entity({ name: "world_versions" })
export class WorldVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => World, { persistence: false, onDelete: "CASCADE" })
  world: World;

  @Column()
  worldId: number;

  // Left out of queries unless asked for: lists of games only need the title and picture.
  @Column({ type: "jsonb", select: false })
  data: Record<string, unknown>;

  @Column({ type: "text" })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "text" })
  thumbnail: string;

  @CreateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  createdAt: Date;
}
