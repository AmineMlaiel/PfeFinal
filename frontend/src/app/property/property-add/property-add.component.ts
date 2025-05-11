// property-add.component.ts (Revised)
import { Component, OnInit, AfterViewInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { PropertyService } from "../../services/property.service"; // Adjust path as needed
import { AuthService } from "../../auth/auth.service"; // Adjust path as needed

// Property features to select from
const PROPERTY_FEATURES = [
  { value: "parking", label: "Parking", icon: "fa-car" },
  { value: "furnished", label: "Furnished", icon: "fa-couch" },
  { value: "airConditioning", label: "Air Conditioning", icon: "fa-snowflake" },
  { value: "heating", label: "Heating", icon: "fa-fire" },
  { value: "internet", label: "Internet", icon: "fa-wifi" },
  { value: "elevator", label: "Elevator", icon: "fa-arrow-up" },
  { value: "balcony", label: "Balcony", icon: "fa-archway" },
  { value: "pool", label: "Swimming Pool", icon: "fa-swimming-pool" },
  { value: "gym", label: "Gym", icon: "fa-dumbbell" },
  { value: "security", label: "Security", icon: "fa-shield-alt" },
  { value: "petFriendly", label: "Pet Friendly", icon: "fa-paw" },
  { value: "garden", label: "Garden", icon: "fa-tree" },
  { value: "laundry", label: "Laundry", icon: "fa-soap" },
];

// Property types
const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "condo", label: "Condo" },
  { value: "villa", label: "Villa" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "office", label: "Office" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

@Component({
  selector: "app-property-add",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: "./property-add.component.html",
  styleUrl: "./property-add.component.scss",
})
export class PropertyAddComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = false;
  error = "";
  success = false;
  today = new Date();

  propertyTypes = PROPERTY_TYPES;
  availableFeatures = PROPERTY_FEATURES;

  latitude: number | null = null;
  longitude: number | null = null;
  private map: any = null;
  private marker: any = null;

  property = {
    title: "",
    description: "",
    propertyType: "",
    pricePerNight: null as number | null, // UPDATED
    pricePerMonth: null as number | null, // UPDATED (optional)
    bedrooms: null as number | null,
    bathrooms: null as number | null,
    area: null as number | null,
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    location: {
      coordinates: [0, 0], 
    },
    features: [] as string[],
    availability: {
      isAvailable: true,
      availableFrom: this.formatDate(new Date()),
      minimumStay: 1,
    },
    // images are handled by imageFiles for upload
  };

  imageFiles: File[] = [];
  imagePreviews: string[] = [];

  constructor(
    private propertyService: PropertyService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.isLoggedIn().subscribe((loggedIn) => {
      if (!loggedIn) {
        this.router.navigate(["/login"], {
          queryParams: { redirect: "/properties/add" },
        });
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 300);
  }

  ngOnDestroy(): void {
    if (this.map) {
      if (typeof this.map.remove === "function") {
        this.map.remove();
      } else if (this.marker) {
        this.marker.setMap(null);
      }
      this.map = null;
      this.marker = null;
    }
  }

  private initMap(): void {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return;
    }
    const mapElement = document.getElementById("location-select-map");
    if (!mapElement) {
      console.error("Map container not found");
      return;
    }
    let initialLat = 34.415248154118444;
    let initialLng = 8.803669105208915;
    this.map = new google.maps.Map(mapElement, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 10,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });
    this.map.addListener("click", (event: any) => {
      const clickedLat = event.latLng.lat();
      const clickedLng = event.latLng.lng();
      this.setMapMarker(clickedLat, clickedLng);
    });
    document.getElementById("street")?.addEventListener("blur", () => this.geocodeAddress());
    document.getElementById("city")?.addEventListener("blur", () => this.geocodeAddress());
    document.getElementById("country")?.addEventListener("blur", () => this.geocodeAddress());
  }

  private geocodeAddress(): void {
    if (!this.property.address.street || !this.property.address.city) return;
    if (!window.google || !window.google.maps) return;
    const geocoder = new google.maps.Geocoder();
    const address = `${this.property.address.street}, ${this.property.address.city}, ${this.property.address.state || ""}, ${this.property.address.country || ""}`;
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        this.map.setCenter(location);
        this.map.setZoom(15);
        const lat = location.lat();
        const lng = location.lng();
        this.setMapMarker(lat, lng);
      }
    });
  }

  private setMapMarker(lat: number, lng: number): void {
    this.latitude = lat;
    this.longitude = lng;
    this.property.location.coordinates = [lng, lat];
    if (this.marker) {
      this.marker.setMap(null);
    }
    this.marker = new google.maps.Marker({
      position: { lat, lng },
      map: this.map,
      draggable: true,
      animation: google.maps.Animation.DROP,
    });
    this.marker.addListener("dragend", () => {
      const position = this.marker.getPosition();
      if (position) {
        this.latitude = position.lat();
        this.longitude = position.lng();
        this.property.location.coordinates = [this.longitude!, this.latitude!];
      }
    });
  }

  updateCoordinates(): void {
    if (this.longitude !== null && this.latitude !== null) {
      this.property.location.coordinates = [this.longitude, this.latitude];
    }
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  toggleFeature(feature: string): void {
    const index = this.property.features.indexOf(feature);
    if (index > -1) {
      this.property.features.splice(index, 1);
    } else {
      this.property.features.push(feature);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    files.forEach((file) => {
      if (!file.type.match(/image.*/)) return;
      this.imageFiles.push(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          this.imagePreviews.push(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    this.imageFiles.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  validateForm(): boolean {
    this.error = ""; // Clear previous errors
    if (!this.property.title.trim()) { this.error = "Title is required"; return false; }
    if (!this.property.description.trim()) { this.error = "Description is required"; return false; }
    if (!this.property.propertyType) { this.error = "Property type is required"; return false; }

    // --- PRICE VALIDATION UPDATED ---
    if (this.property.pricePerNight === null || this.property.pricePerNight <= 0) {
      this.error = "Valid price per night is required (must be > 0)";
      return false;
    }
    if (this.property.pricePerMonth !== null && this.property.pricePerMonth <= 0) {
      this.error = "Valid price per month is required if entered (must be > 0)";
      return false;
    }
    // --- END OF PRICE VALIDATION UPDATE ---

    if (this.property.bedrooms === null || this.property.bedrooms < 0) { this.error = "Valid number of bedrooms is required"; return false; }
    if (this.property.bathrooms === null || this.property.bathrooms < 0) { this.error = "Valid number of bathrooms is required"; return false; }
    if (this.property.area === null || this.property.area <= 0) { this.error = "Valid area is required"; return false; }
    if (!this.property.address.street.trim()) { this.error = "Street address is required"; return false; }
    if (!this.property.address.city.trim()) { this.error = "City is required"; return false; }
    if (!this.property.address.state.trim()) { this.error = "State/Province is required"; return false; }
    if (!this.property.address.zipCode.trim()) { this.error = "Zip/Postal code is required"; return false; }
    if (!this.property.address.country.trim()) { this.error = "Country is required"; return false; }
    if (this.imageFiles.length === 0) { this.error = "At least one image is required"; return false; }
    if (this.latitude === null || this.longitude === null) { this.error = "Please select a location on the map or enter coordinates."; return false; }
    return true;
  }

  submitProperty(): void {
    this.error = "";
    this.loading = true;

    if (!this.validateForm()) {
      this.loading = false;
      return;
    }

    this.updateCoordinates(); // Ensure coordinates are set from lat/lng inputs if map not used or for final check

    // Create a payload that matches the backend expectations, including the owner ID.
    // The backend controller you provided expects fields like `pricePerNight`, `pricePerMonth` directly.
    const propertyPayload = { ...this.property };

    this.propertyService.createProperty(propertyPayload).subscribe({
      next: (propertyResponse) => {
        const propertyId = propertyResponse.data._id;
        if (this.imageFiles.length > 0) {
          const formData = new FormData();
          this.imageFiles.forEach((file) => {
            formData.append("images", file);
          });
          this.propertyService.uploadPropertyImages(propertyId, formData).subscribe({
            next: () => {
              this.success = true;
              this.loading = false;
              setTimeout(() => { this.router.navigate(["/properties", propertyId]); }, 1500);
            },
            error: (err) => {
              console.error("Error uploading images:", err);
              this.error = "Property created but failed to upload images. You can add images later.";
              this.loading = false;
              this.success = true; // Property itself was created
              setTimeout(() => { this.router.navigate(["/properties", propertyId]); }, 2000);
            },
          });
        } else {
          this.success = true;
          this.loading = false;
          setTimeout(() => { this.router.navigate(["/properties", propertyId]); }, 1500);
        }
      },
      error: (err) => {
        console.error("Error creating property:", err);
        this.error = err.error?.message || "Failed to create property. Please try again.";
        if (err.error?.errors) {
            this.error += " Details: " + err.error.errors.join(", ");
        }
        this.loading = false;
      },
    });
  }
}

