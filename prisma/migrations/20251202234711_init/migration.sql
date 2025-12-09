-- AlterTable
ALTER TABLE `photo` ADD COLUMN `updateId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `EntryUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `entryId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntryUpdate_entryId_idx`(`entryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Photo_updateId_idx` ON `Photo`(`updateId`);

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_updateId_fkey` FOREIGN KEY (`updateId`) REFERENCES `EntryUpdate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EntryUpdate` ADD CONSTRAINT `EntryUpdate_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `VehicleEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
