// types/supabase.ts
// Este arquivo é populado com os tipos gerados pelo Supabase CLI.
// Certifique-se de que a saída do comando `supabase gen types typescript --project-id SEU_PROJECT_REF > types/supabase.ts`
// esteja refletida aqui, especialmente para a tabela 'products'.

import { SaleProductItem, PaymentMethod, PaymentStatus, FunnelStage } from "../types"; // Importar enums

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
      sales: { // Definição da tabela sales
        Row: {
          id: string 
          platform_user_id: string 
          push_in_pay_transaction_id: string 
          upsell_push_in_pay_transaction_id: string | null
          order_id_urmify: string | null
          products: Json // Deverá ser SaleProductItem[]
          customer_name: string
          customer_email: string
          customer_ip: string | null
          customer_whatsapp: string
          payment_method: string // PaymentMethod enum como string
          status: string // PaymentStatus enum como string
          upsell_status: string | null // PaymentStatus enum como string
          total_amount_in_cents: number 
          upsell_amount_in_cents: number | null
          original_amount_before_discount_in_cents: number 
          discount_applied_in_cents: number | null
          coupon_code_used: string | null
          created_at: string 
          paid_at: string | null
          tracking_parameters: Json | null // Record<string, string>
          commission_total_price_in_cents: number | null
          commission_gateway_fee_in_cents: number | null
          commission_user_commission_in_cents: number | null
          commission_currency: string | null
          platform_commission_in_cents: number | null
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
        }
        Update: {
          // Similar à Insert, mas todos os campos são opcionais
          id?: string 
          platform_user_id?: string 
          push_in_pay_transaction_id?: string 
          upsell_push_in_pay_transaction_id?: string | null
          // ...e assim por diante para todos os campos
          status?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users" // Ou "profiles" dependendo do seu schema
            referencedColumns: ["id"]
          }
        ]
      }
      customers: { // Definição da tabela customers
        Row: {
          id: string // Email do cliente como ID
          platform_user_id: string
          name: string
          email: string
          whatsapp: string
          products_purchased: string[] // array de product IDs
          funnel_stage: string // FunnelStage enum como string
          first_purchase_date: string
          last_purchase_date: string
          total_orders: number
          total_spent_in_cents: number
          sale_ids: string[] // array de sale IDs
          created_at: string // Adicionado
          updated_at: string // Adicionado
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
           // Similar à Insert, mas todos os campos são opcionais
          id?: string
          // ...e assim por diante
          name?: string
          last_purchase_date?: string
          total_orders?: number
          total_spent_in_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_platform_user_id_fkey"
            columns: ["platform_user_id"]
            referencedRelation: "users" // Ou "profiles"
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
