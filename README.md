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

Deploy easily on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/FlyNext)

## 📄 License

This project is licensed under the MIT License.

---

**Ready to explore the world? Start your journey with FlyNext! 🌍**
