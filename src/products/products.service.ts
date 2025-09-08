import { 
  Injectable, 
  ConflictException, 
  InternalServerErrorException, 
  NotFoundException,
  Inject,
  forwardRef,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';


import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Product, Variation, Image } from './entities'; 

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variation)
    private readonly variationRepository: Repository<Variation>,
    @InjectRepository(Image)
    private readonly imageRepository: Repository<Image>,
    @Inject(forwardRef(() => CloudinaryService))
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createProductDto: CreateProductDto, 
    mainImageFile?: Express.Multer.File,
    additionalImageFiles: Express.Multer.File[] = []
  ): Promise<Product> {
    const queryRunner = this.productRepository.manager.connection.createQueryRunner();
    
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Verificar si ya existe un producto con el mismo nombre
      const existingProduct = await queryRunner.manager.findOne(Product, {
        where: { name: createProductDto.name },
      });

      if (existingProduct) {
        throw new ConflictException('Ya existe un producto con este nombre');
      }

      // 1. Subir la imagen principal a Cloudinary
      let mainImagePublicId: string | undefined;
      

      // 2. Crear el producto
      const product = this.productRepository.create({
        name: createProductDto.name,
        description: createProductDto.description,
        brand: createProductDto.brand,
        category: { id: createProductDto.categoryId },
        price: createProductDto.price,
        salePrice: createProductDto.salePrice,
        isActive: true,
      });

      const savedProduct = await queryRunner.manager.save(Product, product);

      // 3. Procesar imágenes
      const imagesToSave: Partial<Image>[] = [];

      // Subir imagen principal si existe
      if (mainImageFile) {
        const mainImage = await this.cloudinaryService.uploadImage(mainImageFile);
        mainImagePublicId = mainImage.public_id;
        
        imagesToSave.push({
          imageUrl: mainImage.secure_url,
          cloudinaryPublicId: mainImagePublicId,
          isMain: true,
          displayOrder: 0,
          product: savedProduct
        });
      }
      
      if (imagesToSave.length > 0) {
        await queryRunner.manager.save(Image, imagesToSave);
      }
      // 4. Procesar variaciones

      let variationsToSave =   this.variationRepository.create({
          color: createProductDto.color,
          size: createProductDto.size,
          productId: savedProduct.id
         });
        await queryRunner.manager.save(Variation, variationsToSave);

      await queryRunner.commitTransaction();
      
      // 5. Devolver el producto con sus relaciones
      return this.findOne(savedProduct.id);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      if (error.code === '23505') { // Violación de restricción única
        throw new ConflictException('El nombre del producto ya está en uso');
      }
      
      console.error('Error al crear el producto:', error);
      throw new InternalServerErrorException('Error al crear el producto');
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      relations: ['variations', 'images'],
      order: { 
        createdAt: 'DESC',
        images: {
          displayOrder: 'ASC',
        },
      },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['variations', 'images'],
      order: {
        images: {
          displayOrder: 'ASC',
        },
      },
    });
    
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto, file?: Express.Multer.File): Promise<Product> {
    const queryRunner = this.productRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.findOne(id);
      
      // Verificar si se está actualizando el nombre
      if (updateProductDto.name && updateProductDto.name !== product.name) {
        const existingProduct = await queryRunner.manager.findOne(Product, {
          where: { name: updateProductDto.name },
        });
        
        if (existingProduct && existingProduct.id !== id) {
          throw new ConflictException('Ya existe otro producto con este nombre');
        }
      }

      // Procesar imagen principal si se proporciona
      if (file) {
        // Eliminar la imagen principal anterior si existe
        const mainImage = await queryRunner.manager.findOne(Image, {
          where: { product: { id }, isMain: true }
        });

        if (mainImage && mainImage.cloudinaryPublicId) {
          try {
            await this.cloudinaryService.deleteImage(mainImage.cloudinaryPublicId);
          } catch (error) {
            console.error('Error al eliminar la imagen anterior de Cloudinary:', error);
          }
          await queryRunner.manager.remove(Image, mainImage);
        }

        // Subir la nueva imagen
        const result = await this.cloudinaryService.uploadImage(file);
        
        // Crear nueva entrada de imagen principal
        const newMainImage = this.imageRepository.create({
          imageUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
          isMain: true,
          displayOrder: 0,
          product: { id }
        });
        
        await queryRunner.manager.save(Image, newMainImage);
      }

      // Actualizar campos básicos del producto
      const { color, size, ...productData } = updateProductDto;
      await queryRunner.manager.update(Product, id, productData);

 

     // Actualizar variaciones si se proporcionan
      if (color !== undefined || size !== undefined) {
        // 2. Buscamos si ya existe una variación para este producto
        const existingVariation = await queryRunner.manager.findOne(Variation, {
            where: { productId: id }
        });
    
        // 3. Si existe, la actualizamos
        if (existingVariation) {
            if (color !== undefined) existingVariation.color = color;
            if (size !== undefined) existingVariation.size = size;
            await queryRunner.manager.save(Variation, existingVariation);
        } 
        // 4. Si no existe y se está proporcionando algún valor, creamos una nueva
        else if (color || size) {
            const newVariation = new Variation();
            newVariation.productId = id;
            if (color !== undefined) newVariation.color = color;
            if (size !== undefined) newVariation.size = size;
            
            await queryRunner.manager.save(Variation, newVariation);
        }
    }

      // Actualizar imágenes adicionales si se proporcionan
      if (file) {
        // Eliminar imágenes adicionales existentes (excepto la principal)
        await queryRunner.manager.delete(Image, { 
          product: { id },
          isMain: false
        });
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al actualizar el producto:', error);
      throw new InternalServerErrorException('Error al actualizar el producto');
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number): Promise<void> {
    const queryRunner = this.productRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this.findOne(id);
      
      // Obtener todas las imágenes del producto
      const images = await queryRunner.manager.find(Image, {
        where: { product: { id } }
      });
      
      // Eliminar imágenes de Cloudinary
      for (const image of images) {
        if (image.cloudinaryPublicId) {
          try {
            await this.cloudinaryService.deleteImage(image.cloudinaryPublicId);
          } catch (error) {
            console.error(`Error al eliminar la imagen ${image.cloudinaryPublicId} de Cloudinary:`, error);
          }
        }
      }
      
      // Eliminar imágenes de la base de datos
      await queryRunner.manager.delete(Image, { product: { id } });
      
      // Eliminar variaciones
      await queryRunner.manager.delete(Variation, { product: { id } });
      
      // Eliminar el producto (o marcar como inactivo)
      await queryRunner.manager.update(Product, id, { isActive: false });
      
      await queryRunner.commitTransaction();
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error al eliminar el producto:', error);
      throw new InternalServerErrorException('Error al eliminar el producto');
    } finally {
      await queryRunner.release();
    }
  }



}
