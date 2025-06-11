
// types/supabase.ts
// This file should ideally be populated by `supabase gen types typescript`.
// The structure below is based on the assumed database schema.


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          is_super_admin: boolean | null
          is_active: boolean | null
          created_at: string | null
          email: string | null
        }
        Insert: {
          id: string
          name?: string | null
          is_super_admin?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          is_super_admin?: boolean | null
          is_active?: boolean | null
          created_at?: string | null
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          platform_user_id: string
          slug: string
          name: string
          description: string
          price_in_cents: number
          image_url: string | null
          checkout_customization: Json
          delivery_url: string | null
          total_sales: number | null
          clicks: number | null
          checkout_views: number | null
          conversion_rate: number | null
          abandonment_rate: number | null
          order_bump: Json | null
          upsell: Json | null
          coupons: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          platform_user_id: string
          slug: string
          name: string
          description: string
          price_in_cents: number
          image_url?: string | null
          checkout_customization?: Json
          delivery_url?: string | null
          total_sales?: number | null
          clicks?: number | null
          checkout_views?: number | null
          conversion_rate?: number | null
          abandonment_rate?: number | null
          order_bump?: Json | null
          upsell?: Json | null
          coupons?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_user_id?: string
          slug?: string
          name?: string
          description?: string
          price_in_cents?: number
          image_url?: string | null
          checkout_customization?: Json
          delivery_url?: string | null
          total_sales?: number | null
          clicks?: number | null
          checkout_views?: number | null
          conversion_rate?: number | null
          abandonment_rate?: number | null
          order_bump?: Json | null
          upsell?: Json | null
          coupons?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sales: {
        Row: {
          id: string
          platform_user_id: string
          push_in_pay_transaction_id: string
          upsell_push_in_pay_transaction_id: string | null
          order_id_urmify: string | null
          products: Json
          customer_name: string
          customer_email: string
          customer_ip: string | null
          customer_whatsapp: string
          payment_method: string
          status: string
          upsell_status: string | null
          total_amount_in_cents: number
          upsell_amount_in_cents: number | null
          original_amount_before_discount_in_cents: number
          discount_applied_in_cents: number | null
          coupon_code_used: string | null
          created_at: string
          paid_at: string | null
          tracking_parameters: Json | null
          commission_total_price_in_cents: number | null
          commission_gateway_fee_in_cents: number | null
          commission_user_commission_in_cents: number | null
          commission_currency: string | null
          platform_commission_in_cents: number | null
          updated_at: string;
        }
        Insert: {
          id?: string
          platform_user_id: string
          push_in_pay_transaction_id: string
          upsell_push_in_pay_transaction_id?: string | null
          order_id_urmify?: string | null
          products: Json
          customer_name: string
          customer_email: string
          customer_ip?: string | null
          customer_whatsapp: string
          payment_method: string
          status: string
          upsell_status?: string | null
          total_amount_in_cents: number
          upsell_amount_in_cents?: number | null
          original_amount_before_discount_in_cents: number
          discount_applied_in_cents?: number | null
          coupon_code_used?: string | null
          created_at?: string
          paid_at?: string | null
          tracking_parameters?: Json | null
          commission_total_price_in_cents?: number | null
          commission_gateway_fee_in_cents?: number | null
          commission_user_commission_in_cents?: number | null
          commission_currency?: string | null
          platform_commission_in_cents?: number | null
          updated_at?: string;
        }
        Update: {
          id?: string
          platform_user_id?: string
          push_in_pay_transaction_id?: string
          upsell_push_in_pay_transaction_id?: string | null
          order_id_urmify?: string | null
          products?: Json
          customer_name?: string
          customer_email?: string
          customer_ip?: string | null
          customer_whatsapp?: string
          payment_method?: string
          status?: string
          upsell_status?: string | null
          total_amount_in_cents?: number
          upsell_amount_in_cents?: number | null
          original_amount_before_discount_in_cents?: number
          discount_applied_in_cents?: number | null
          coupon_code_used?: string | null
          created_at?: string
          paid_at?: string | null
          tracking_parameters?: Json | null
          commission_total_price_in_cents?: number | null
          commission_gateway_fee_in_cents?: number | null
          commission_user_commission_in_cents?: number | null
          commission_currency?: string | null
          platform_commission_in_cents?: number | null
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "sales_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      customers: {
        Row: {
          id: string
          platform_user_id: string
          name: string
          email: string
          whatsapp: string
          products_purchased: string[]
          funnel_stage: string
          first_purchase_date: string
          last_purchase_date: string
          total_orders: number
          total_spent_in_cents: number
          sale_ids: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          platform_user_id: string
          name: string
          email: string
          whatsapp: string
          products_purchased?: string[]
          funnel_stage?: string
          first_purchase_date?: string
          last_purchase_date?: string
          total_orders?: number
          total_spent_in_cents?: number
          sale_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          platform_user_id?: string
          name?: string
          email?: string
          whatsapp?: string
          products_purchased?: string[]
          funnel_stage?: string
          first_purchase_date?: string
          last_purchase_date?: string
          total_orders?: number
          total_spent_in_cents?: number
          sale_ids?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      app_settings: {
        Row: {
          platform_user_id: string
          custom_domain: string | null
          checkout_identity: Json | null
          smtp_settings: Json | null
          api_tokens: Json | null
          pixel_integrations: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          platform_user_id: string
          custom_domain?: string | null
          checkout_identity?: Json | null
          smtp_settings?: Json | null
          api_tokens?: Json | null
          pixel_integrations?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          platform_user_id?: string
          custom_domain?: string | null
          checkout_identity?: Json | null
          smtp_settings?: Json | null
          api_tokens?: Json | null
          pixel_integrations?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      platform_settings: {
        Row: {
          id: "global"
          platform_commission_percentage: number
          platform_fixed_fee_in_cents: number
          platform_account_id_push_in_pay: string // CORRIGIDO AQUI
          updated_at: string
        }
        Insert: {
          id: "global"
          platform_commission_percentage: number
          platform_fixed_fee_in_cents: number
          platform_account_id_push_in_pay: string // CORRIGIDO AQUI
          updated_at?: string
        }
        Update: {
          id?: "global"
          platform_commission_percentage?: number
          platform_fixed_fee_in_cents?: number
          platform_account_id_push_in_pay?: string // CORRIGIDO AQUI
          updated_at?: string
        }
        Relationships: []
      }
      abandoned_carts: {
        Row: {
          id: string
          platform_user_id: string
          customer_name: string
          customer_email: string
          customer_whatsapp: string
          product_id: string
          product_name: string
          potential_value_in_cents: number
          created_at: string
          last_interaction_at: string
          status: string
          tracking_parameters: Json | null
        }
        Insert: {
          id?: string
          platform_user_id: string
          customer_name: string
          customer_email: string
          customer_whatsapp: string
          product_id: string
          product_name: string
          potential_value_in_cents: number
          created_at?: string
          last_interaction_at?: string
          status?: string
          tracking_parameters?: Json | null
        }
        Update: {
          id?: string
          platform_user_id?: string
          customer_name?: string
          customer_email?: string
          customer_whatsapp?: string
          product_id?: string
          product_name?: string
          potential_value_in_cents?: number
          created_at?: string
          last_interaction_at?: string
          status?: string
          tracking_parameters?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
