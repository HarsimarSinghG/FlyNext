# ✈️ FlyNext

**Your Next Adventure Starts Here**

FlyNext is a modern, full-featured travel booking platform that makes planning your perfect trip effortless. Search and book flights and hotels with ease, manage your bookings, and discover amazing destinations around the world.

## 🌟 Features

- **Flight Search & Booking** - Find the best flight deals with flexible search options
- **Hotel Search & Booking** - Discover and book accommodations worldwide
- **User Authentication** - Secure login and registration system
- **Booking Management** - Track and manage all your reservations
- **Hotel Management** - Property owners can list and manage their hotels
- **Interactive Maps** - Location-based search with map integration
- **Real-time Notifications** - Stay updated with booking confirmations
- **PDF Invoices** - Generate and download booking receipts
- **Responsive Design** - Seamless experience across all devices

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite with Prisma migrations
- **Authentication**: JWT-based auth with bcrypt
- **Maps**: Leaflet & React Leaflet
- **PDF Generation**: jsPDF & PDFKit
- **Icons**: React Icons

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FlyNext.git
   cd FlyNext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

1. **Search Flights**: Enter your origin, destination, dates, and passenger count
2. **Search Hotels**: Find accommodations by city, dates, and filters
3. **Create Account**: Sign up to manage bookings and access all features
4. **Book & Manage**: Complete bookings and track them in your dashboard
5. **Hotel Owners**: List and manage your properties through the hotel management panel

## 🗄️ Database Schema

The application uses Prisma with SQLite and includes models for:
- Users (authentication & profiles)
- Flights (search & booking)
- Hotels (listings & management)
- Bookings (reservations & invoices)
- Notifications (user alerts)

## 🚀 Deployment

This application is deployed on **Amazon EC2** for production hosting.

### EC2 Deployment Setup

1. **Launch EC2 Instance**
   - Choose Ubuntu 20.04 LTS or later
   - Select appropriate instance type (t3.medium recommended)
   - Configure security groups for HTTP (80), HTTPS (443), and SSH (22)

2. **Server Configuration**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Nginx for reverse proxy
   sudo apt install nginx -y
   ```

3. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/YOUR_USERNAME/FlyNext.git
   cd FlyNext
   
   # Install dependencies
   npm install
   
   # Build application
   npm run build
   
   # Start with PM2
   pm2 start npm --name "flynext" -- start
   pm2 save
   pm2 startup
   ```

4. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Production Features
- **Process Management**: PM2 ensures application stays running
- **Reverse Proxy**: Nginx handles static files and load balancing
- **SSL Certificate**: Configure with Let's Encrypt for HTTPS
- **Auto-restart**: Application automatically restarts on server reboot

## 📄 License

This project is licensed under the MIT License.

---

**Ready to explore the world? Start your journey with FlyNext! 🌍**
