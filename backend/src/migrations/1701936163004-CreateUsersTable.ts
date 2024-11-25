import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsersTable1701936163004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "users",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "username",
                        type: "varchar",
                        isUnique: true
                    },
                    {
                        name: "email",
                        type: "varchar",
                        isUnique: true
                    },
                    {
                        name: "password",
                        type: "varchar"
                    },
                    {
                        name: "isVerified",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "isAdmin",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "refreshToken",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "refreshTokenExpiresAt",
                        type: "timestamp",
                        isNullable: true
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            }),
            true
        );

        // Enable uuid-ossp extension for UUID generation
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("users");
    }
}
