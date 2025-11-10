// src/index.ts
import 'express-async-errors'; // Must be imported before other imports to handle async errors
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import config from './config';
import swaggerUi from 'swagger-ui-express';
import { specs } from './infrastructure/swagger/swagger';

// Import repositories
import { PrismaUserRepository } from './infrastructure/persistence/repositories/PrismaUserRepository';
import { PrismaBudgetaryOfferRepository } from './infrastructure/persistence/repositories/PrismaBudgetaryOfferRepository';
import { PrismaLoaRepository } from './infrastructure/persistence/repositories/PrismaLoaRepository';
import { PrismaVendorRepository } from './infrastructure/persistence/repositories/PrismaVendorRepository';
import { PrismaItemRepository } from './infrastructure/persistence/repositories/PrismaItemRepository';
import { PrismaPurchaseOrderRepository } from './infrastructure/persistence/repositories/PrismaPurchaseOrderRepository';
import { PrismaVendorItemRepository } from './infrastructure/persistence/repositories/PrismaVendorItemRepository';
import { PrismaTenderRepository } from './infrastructure/persistence/repositories/PrismaTenderRepository';
import { PrismaShippingAddressRepository } from './infrastructure/persistence/repositories/PrismaShippingAddressRepository';
import { PrismaFdrRepository } from './infrastructure/persistence/repositories/PrismaFdrRepository';
import { PrismaPocRepository } from './infrastructure/persistence/repositories/PrismaPocRepository';
import { PrismaInspectionAgencyRepository } from './infrastructure/persistence/repositories/PrismaInspectionAgencyRepository';
import { PrismaBillRepository } from './infrastructure/persistence/repositories/PrismaBillRepository';
import { PrismaOtherDocumentRepository } from './infrastructure/persistence/repositories/PrismaOtherDocumentRepository';

// Import services
import { AuthService } from './application/services/AuthService';
import { BudgetaryOfferService } from './application/services/BudgetaryOfferService';
import { LoaService } from './application/services/LOAService';
import { BulkImportService } from './application/services/BulkImportService';
import { VendorService } from './application/services/VendorService';
import { ItemService } from './application/services/ItemService';
import { PurchaseOrderService } from './application/services/PurchaseOrderService';
import { S3Service } from './infrastructure/services/S3Service';  // Updated import
import { PDFService } from './infrastructure/services/PDFService'; // New import
import { OCRService } from './infrastructure/services/OCRService';
import { POPDFService } from './infrastructure/services/POPdfService';
import { EmailService } from './infrastructure/services/EmailService';
import { DocumentVerifierService } from './infrastructure/services/DocumentVerificationService';
import { TokenService } from './infrastructure/services/TokenService';
import { UserService } from './application/services/UserService';
import { DashboardService } from './application/services/DashboardService';
import { DashboardController } from './interfaces/http/controllers/DashboardController';
import { SiteController } from './interfaces/http/controllers/SiteController';
import { CustomerService } from './application/services/CustomerService';
import { TenderService } from './application/services/TenderService';
import { ShippingAddressService } from './application/services/ShippingAddressService';
import { FdrService } from './application/services/FdrService';
import { BulkImportFdrService } from './application/services/BulkImportFdrService';
import { PocService } from './application/services/PocService';
import { InspectionAgencyService } from './application/services/InspectionAgencyService';
import { BillService } from './application/services/BillService';
// Import controllers
import { AuthController } from './interfaces/http/controllers/AuthController';
import { BudgetaryOfferController } from './interfaces/http/controllers/BudgetaryOfferController';
import { LoaController } from './interfaces/http/controllers/LoaController';
import { VendorController } from './interfaces/http/controllers/VendorController';
import { ItemController } from './interfaces/http/controllers/ItemController';
import { PurchaseOrderController } from './interfaces/http/controllers/PurchaseOrderController';
import { UserController } from './interfaces/http/controllers/UserController';
import { CustomerController } from './interfaces/http/controllers/CustomerController';
import { TenderController } from './interfaces/http/controllers/TenderController';
import { ShippingAddressController } from './interfaces/http/controllers/ShippingAddressController';
import { FdrController } from './interfaces/http/controllers/FdrController';
import { PocController } from './interfaces/http/controllers/PocController';
import { InspectionAgencyController } from './interfaces/http/controllers/InspectionAgencyController';
import { BillController } from './interfaces/http/controllers/BillController';

// Import routes
import { authRoutes } from './interfaces/http/routes/auth.routes';
import { budgetaryOfferRoutes } from './interfaces/http/routes/budgetaryOffer.routes';
import { loaRoutes } from './interfaces/http/routes/loa.routes';
import { vendorRoutes } from './interfaces/http/routes/vendor.routes';
import { itemRoutes } from './interfaces/http/routes/item.routes';
import { purchaseOrderRoutes } from './interfaces/http/routes/purchaseOrder.routes';
import { userRoutes } from './interfaces/http/routes/user.routes';
import { setupDashboardRoutes } from './interfaces/http/routes/dashboard.routes';
import { siteRoutes } from './interfaces/http/routes/site.routes';
import { customerRoutes } from './interfaces/http/routes/customer.routes';
import { tenderRoutes } from './interfaces/http/routes/tender.routes';
import { shippingAddressRoutes } from './interfaces/http/routes/shippingAddress.routes';
import { fdrRoutes } from './interfaces/http/routes/fdr.routes';
import { pocRoutes } from './interfaces/http/routes/poc.routes';
import { inspectionAgencyRoutes } from './interfaces/http/routes/inspection-agency.routes';
import { billRoutes } from './interfaces/http/routes/bill.routes';
import { BudgetaryOfferValidator } from './application/validators/budgetaryOffer.validator';
import { mkdirSync } from 'fs';
import { unlinkSync, readdirSync, statSync } from 'fs';

// Import error handler
import { errorHandler } from './shared/middlware/errorhandler';
import path from 'path';
import { VendorItemService } from './application/services/VendorItemService';
import { VendorItemController } from './interfaces/http/controllers/VendorItemController';
import { vendorItemRoutes } from './interfaces/http/routes/vendorItem.routes';
import { PrismaSiteRepository } from './infrastructure/persistence/repositories/PrismaSiteRepository';
import { SiteService } from './application/services/SiteService';

async function startServer() {
  const app = express();

  // Initialize Prisma clieant
  const prisma = new PrismaClient();

  // Global middleware
  app.use(express.json());
  
  // Configure CORS to allow requests from the frontend
  app.use(cors({
   origin: ['https://emprise.prossimatech.com', 'https://www.emprise.prossimatech.com', "https://client.prossimatech.com" ,'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(helmet());

  // Initialize services
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.region || !config.aws.s3.bucket) {
    throw new Error('AWS credentials are not properly configured');
  }

  // Initialize repositories
  const userRepository = new PrismaUserRepository(prisma);
  const budgetaryOfferRepository = new PrismaBudgetaryOfferRepository(prisma);
  const loaRepository = new PrismaLoaRepository(prisma);
  const vendorRepository = new PrismaVendorRepository(prisma);
  const itemRepository = new PrismaItemRepository(prisma);
  const purchaseOrderRepository = new PrismaPurchaseOrderRepository(prisma);
  const vendorItemRepository = new PrismaVendorItemRepository(prisma);
  const siteRepository = new PrismaSiteRepository(prisma);
  const tenderRepository = new PrismaTenderRepository(prisma);
  const shippingAddressRepository = new PrismaShippingAddressRepository(prisma);
  const fdrRepository = new PrismaFdrRepository(prisma);
  const pocRepository = new PrismaPocRepository(prisma);
  const inspectionAgencyRepository = new PrismaInspectionAgencyRepository(prisma);
  const billRepository = new PrismaBillRepository(prisma);
  const otherDocumentRepository = new PrismaOtherDocumentRepository(prisma);

  const s3Service = new S3Service({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    bucket: config.aws.s3.bucket
  });

  const poPdfService = new POPDFService(s3Service);
  const pdfService = new PDFService(s3Service);
  const documentVerifier = new DocumentVerifierService(s3Service);
  const ocrService = new OCRService();
  const tokenService = new TokenService(config.jwt.secret);
  const emailService = new EmailService({
    user: config.email.user,
    from: config.email.from,
    oauth2: {
      clientId: config.email.oauth2.clientId,
      clientSecret: config.email.oauth2.clientSecret,
      refreshToken: config.email.oauth2.refreshToken,
      // tenantId: config.email.oauth2.tenantId
    },

  }, pdfService, poPdfService);


  const authService = new AuthService(userRepository);
  const budgetaryOfferValidator = new BudgetaryOfferValidator();
  const budgetaryOfferService = new BudgetaryOfferService(
    budgetaryOfferRepository,
    budgetaryOfferValidator,
    pdfService,
    documentVerifier,
    emailService,
    tokenService
  );
  const loaService = new LoaService(loaRepository, tenderRepository, otherDocumentRepository, s3Service);
  const vendorService = new VendorService(vendorRepository);
  const vendorItemService = new VendorItemService(vendorItemRepository);
  const itemService = new ItemService(itemRepository);
  const POpdfService = new POPDFService(s3Service);
  const purchaseOrderService = new PurchaseOrderService(
    purchaseOrderRepository,
    vendorItemRepository,
    loaRepository,
    s3Service,
    POpdfService,
    documentVerifier,
    emailService,
    tokenService
  );
  const userService = new UserService(userRepository);
  const siteService = new SiteService(siteRepository);
  const userController = new UserController(userService);
  const customerService = new CustomerService(prisma);
  const tenderService = new TenderService(tenderRepository, loaRepository, s3Service);
  const shippingAddressService = new ShippingAddressService(shippingAddressRepository);
  const bulkImportService = new BulkImportService(prisma);
  const bulkImportFdrService = new BulkImportFdrService(prisma);
  const fdrService = new FdrService(fdrRepository, s3Service, ocrService, config.openRouterApiKey);
  const pocService = new PocService(pocRepository);
  const inspectionAgencyService = new InspectionAgencyService(inspectionAgencyRepository);
  const billService = new BillService(billRepository, s3Service);

  // Initialize controllers
  const authController = new AuthController(authService);
  const budgetaryOfferController = new BudgetaryOfferController(budgetaryOfferService);
  const loaController = new LoaController(loaService, bulkImportService);
  const vendorController = new VendorController(vendorService);
  const itemController = new ItemController(itemService);
  const purchaseOrderController = new PurchaseOrderController(purchaseOrderService);
  const vendorItemController = new VendorItemController(vendorItemService);
  const siteController = new SiteController(siteService);
  const customerController = new CustomerController(customerService);
  const tenderController = new TenderController(tenderService);
  const shippingAddressController = new ShippingAddressController(shippingAddressService);
  const fdrController = new FdrController(fdrService, bulkImportFdrService);
  const pocController = new PocController(pocService);
  const inspectionAgencyController = new InspectionAgencyController(inspectionAgencyService);
  const billController = new BillController(billService);

  // Initialize Dashboard services and controller
  const dashboardService = new DashboardService(prisma);
  const dashboardController = new DashboardController(dashboardService);

  if (!config.email.user || !config.email.from || !config.email.oauth2.clientId ||
    !config.email.oauth2.clientSecret || !config.email.oauth2.refreshToken) {
    throw new Error('Email configuration is not properly configured');
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.use('/api/auth', authRoutes(authController));

  app.use(
    '/api',
    vendorItemRoutes(vendorItemController)
  );

  app.use(
    '/api/budgetary-offers',
    budgetaryOfferRoutes(budgetaryOfferController)
  );

  app.use(
    '/api/loas',
    loaRoutes(loaController)
  );

  app.use(
    '/api/vendors',
    vendorRoutes(vendorController)
  );

  app.use(
    '/api/items',
    itemRoutes(itemController)
  );

  app.use(
    '/api/purchase-orders',
    purchaseOrderRoutes(purchaseOrderController)
  );

  app.use(
    '/api/users',
    userRoutes(userController)
  );

  // Add dashboard routes
  app.use(
    '/api/dashboard',
    setupDashboardRoutes(dashboardController)
  );

  app.use(
    '/api/sites',
    siteRoutes(siteController)
  );

  app.use(
    '/api/customers',
    customerRoutes(customerController)
  );

  app.use(
    '/api/tenders',
    tenderRoutes(tenderController)
  );

  app.use(
    '/api/shipping-addresses',
    shippingAddressRoutes(shippingAddressController)
  );

  app.use(
    '/api/fdrs',
    fdrRoutes(fdrController)
  );

  app.use(
    '/api/pocs',
    pocRoutes(pocController)
  );

  app.use(
    '/api/inspection-agencies',
    inspectionAgencyRoutes(inspectionAgencyController)
  );

  app.use(
    '/api',
    billRoutes(billController)
  );

  // Create uploads directory if it doesn't exist
  mkdirSync('uploads', { recursive: true });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Start the server
  const port = config.port;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${config.environment}`);
    console.log('Routes initialized:');
    console.log('- /api/auth');
    console.log('- /api/budgetary-offers');
    console.log('- /api/loas');
    console.log('- /api/vendors');
    console.log('- /api/items');
    console.log('- /api/vendors/:vendorId/items');
    console.log('- /api/items/:itemId/vendors');
    console.log('- /api/purchase-orders');
    console.log('- /api/users');
    console.log('- /api-docs');
    console.log('- /api/dashboard');
    console.log('- /api/sites');
    console.log('- /api/customers');
    console.log('- /api/tenders');
    console.log('- /api/shipping-addresses');
    console.log('- /api/emds');
  });

  // Cleanup uploads directory periodically (every 24 hours)
  setInterval(() => {
    try {
      const files = readdirSync('uploads');
      const now = Date.now();
      files.forEach(file => {
        try {
          const filePath = `uploads/${file}`;
          const stats = statSync(filePath);
          if (now - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
            unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`Error processing file: ${file}`, error);
        }
      });
    } catch (error) {
      console.error('Error cleaning up uploads directory:', error);
    }
  }, 24 * 60 * 60 * 1000);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the server
startServer()
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });