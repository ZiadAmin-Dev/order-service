export interface BranchInfo {
    id: number;
    restaurantId: number;
    name: string;
    countryCode: string;
    isActive: boolean;
    acceptOrders: boolean;
    lat: number;
    lng: number;
    deliveryRadiusKm: number;
    currency: string;
    commission: number; // percentage, e.g. 15
}

export interface ValidatedProduct {
    productId: number;
    name: string;
    price: number; // minor units
    isAvailable: boolean;
    inStock: boolean;
    imageUrl?: string;
}

export interface CustomerAddressInfo {
    id: number;
    customerId: number;
    addressText: string;
    lat: number;
    lng: number;
}
