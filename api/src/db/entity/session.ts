import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * A signed-in browser. Only a hash of the token is stored, so reading this
 * table doesn't give anyone a way to sign in.
 */
@Entity({ name: "sessions" })
export class Session {
  @PrimaryColumn({ type: "varchar" })
  tokenHash: string;

  // A plain string with no foreign key: users.id is an integer in production
  // but a uuid in databases built from the entity.
  @Index("IDX_sessions_userId")
  @Column({ type: "varchar" })
  userId: string;

  @CreateDateColumn({ type: "timestamptz", default: () => "NOW()" })
  createdAt: Date;

  @Column({ type: "timestamptz" })
  expiresAt: Date;
}
