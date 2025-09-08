import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Variation } from './variations.entity';
import { Image } from './image.entity';
import { Category } from 'src/categories/entities/category.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 200, nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    brand: string;

    @Column({ name: 'category_id', type: 'integer', nullable: true })
    categoryId: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    price: number;

    @Column({ name: 'sale_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
    salePrice: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'image_url', type: 'varchar', nullable: true })
    imageUrl: string;

    @ManyToOne(() => Category, category => category.products)
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @OneToMany(() => Variation, (variation) => variation.product)
    variations: Variation[];

    @OneToMany(() => Image, (image) => image.product)
    images: Image[];
}
