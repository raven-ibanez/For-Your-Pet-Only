# For Your Pets Only - Furbaby Essentials 🐾

A beautiful, modern e-commerce website for pet supplies built with React, TypeScript, and Tailwind CSS.

## 🎨 Design Theme

- **Primary Color**: Orange (#FF8C42)
- **Accent Color**: Orange Dark (#F37021)
- **Background**: Cream (#FFF8F0)
- **Typography**: Poppins (Display), Inter (Body)

## ✨ Features

### E-Commerce Features
- 🛍️ Full-featured shopping cart
- 📱 Responsive mobile-first design
- 🎨 Beautiful orange and white color scheme
- 🐕 Pet-focused product catalog
- 💳 Multiple payment methods
- 🚚 Delivery, pickup, and dine-in options
- ⚙️ Product customization (sizes, add-ons)
- 👑 Admin dashboard for product management

### 🎯 POS System Features (NEW!)
- 💰 **Complete Point of Sale** - In-store transaction processing
- 📊 **Sales Analytics** - Comprehensive business reports
- 📦 **Inventory Management** - Real-time stock tracking
- 👥 **Customer Management** - Customer profiles with pet information
- 💎 **Loyalty Program** - Points earning and redemption
- 💵 **Cash Management** - Cash drawer sessions and reconciliation
- 📈 **Business Intelligence** - Performance metrics and insights
- 🏪 **Supplier Management** - Purchase orders and supplier tracking

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: Supabase Real-time subscriptions

## 📁 Project Structure

```
src/
├── components/      # React components
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── lib/            # Supabase configuration & POS API
└── data/           # Static data

supabase/
└── migrations/     # Database migrations & POS system

docs/
├── POS_SYSTEM_DOCUMENTATION.md      # Complete POS reference
├── POS_SYSTEM_SUMMARY.md            # POS overview
├── POS_INTEGRATION_GUIDE.md         # Frontend integration
├── POS_SQL_QUICK_REFERENCE.sql      # SQL query examples
├── REDESIGN_SUMMARY.md              # Design changes
└── COLOR_GUIDE.md                   # Color palette guide
```

## 🎯 Core Components

### Customer-Facing
- **Header**: Main navigation with cart icon
- **Hero**: Eye-catching landing section
- **Menu**: Product listing with categories
- **Cart**: Shopping cart management
- **Checkout**: Order placement flow

### Admin & POS
- **AdminDashboard**: Product and settings management
- **SalesDashboard**: POS analytics and reports (coming soon)
- **InventoryManager**: Stock management (integrated)
- **CustomerManager**: Customer profiles (integrated)

## 🌈 Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| Orange | #FF8C42 | Primary buttons, borders |
| Orange Dark | #F37021 | Hover states, emphasis |
| Orange Light | #FFB380 | Accents |
| Cream | #FFF8F0 | Background |
| Beige | #FFEBD4 | Secondary background |
| Brown | #8B4513 | Text |

## 📊 POS System

This project includes a comprehensive Point of Sale (POS) system. See detailed documentation:

- **[POS System Overview](POS_SYSTEM_SUMMARY.md)** - Complete feature list
- **[POS Documentation](POS_SYSTEM_DOCUMENTATION.md)** - Full reference manual
- **[Integration Guide](POS_INTEGRATION_GUIDE.md)** - Frontend integration
- **[SQL Reference](POS_SQL_QUICK_REFERENCE.sql)** - 40+ ready-to-use queries

### POS Capabilities

- ✅ 13 database tables for complete business operations
- ✅ 16+ analytics functions
- ✅ 9 pre-built reporting views
- ✅ Automated inventory tracking
- ✅ Customer loyalty program
- ✅ Staff performance tracking
- ✅ Cash drawer reconciliation
- ✅ Multi-payment support
- ✅ Purchase order management
- ✅ Expense tracking

### Quick Start POS

```bash
# 1. Run database migrations
# In Supabase SQL Editor, run:
# - supabase/migrations/20250102000000_create_pos_system.sql
# - supabase/migrations/20250102000001_pos_advanced_features.sql

# 2. Start development server
npm run dev

# 3. Access admin dashboard
# Navigate to: http://localhost:5174/admin
```

## 📝 License

This project is for WebNegosyo Websites.

---

**Made with ❤️ for pet lovers everywhere! 🐶🐱**
