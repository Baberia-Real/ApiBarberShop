import { Product } from 'src/products/entities';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'parent_id', nullable: true })
    parentId: number;

    @ManyToOne(() => Category, category => category.children, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parent_id' })
    parent: Category;

    @OneToMany(() => Category, category => category.parent)
    children: Category[];

    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'display_order', type: 'integer', default: 0 })
    displayOrder: number;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @OneToMany(() => Product, product => product.category, { onDelete: 'SET NULL' })
    products: Product[];
}
