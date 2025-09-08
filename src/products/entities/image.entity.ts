import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('images')
export class Image {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'image_url', length: 500, nullable: false })
  imageUrl: string;

  @Column({ name: 'cloudinary_public_id', type: 'varchar', length: 200, nullable: true })
  cloudinaryPublicId: string | null;

  @Column({ name: 'is_main', type: 'boolean', default: false })
  isMain: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;
  
}