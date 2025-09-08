import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseInterceptors, 
  UploadedFile, 
  UploadedFiles,
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator, 
  UsePipes,
  ValidationPipe, 
  Patch,
  Delete
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'mainImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 10 }
  ]))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: { 
      mainImage: Express.Multer.File[]
    },
  ) {
    if (typeof createProductDto === 'string') {
      createProductDto = JSON.parse(createProductDto);
    }

    return this.productsService.create(
      createProductDto, 
      files.mainImage?.[0]
    );
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  // @Patch(':id')
  // @UseInterceptors(FileInterceptor('image'))
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateProductDto: UpdateProductDto,
  //   @UploadedFile(
  //     new ParseFilePipe({
  //       validators: [
  //         new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
  //         new FileTypeValidator({ fileType: 'image/*' }),
  //       ],
  //       fileIsRequired: false,
  //     }),
  //   )
  //   file?: Express.Multer.File,
  // ) {
  //   return this.productsService.update(+id, updateProductDto, file);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}
