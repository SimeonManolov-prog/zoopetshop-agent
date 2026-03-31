# Zoo-PetShop Dual Agent System — Setup Guide

## Архитектура

**Агент 1 — Автоматизатор** (n8n + Shopify)
- Обработка на поръчки и инвентар
- Автоматични имейли и нотификации
- Синхронизация на продукти и цени
- Обработка на клиентски заявки чрез Claude AI

**Агент 2 — Обучител** (Claude API)
- Анализ на логове от Агент 1
- Генериране на нови правила и workflow шаблони
- A/B тестване на стратегии
- Feedback loop — прилагане на оптимизации обратно

---

## Стъпка 1: Shopify App (ГОТОВО)

Приложението `ZooPetShop-Agent` е създадено в Dev Dashboard.

- **App ID**: 341054619649
- **Client ID**: `296d1b73fac93dd5769744b385ea8409`
- **Client Secret**: `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`
- **Версия**: v1.0-agent (Активна)
- **API Scopes**: read_all_orders, read_orders, write_orders, read_customers, write_customers, read_products, write_products, read_inventory, write_inventory

### Инсталиране в магазина (ръчна стъпка)

1. Отвори: `admin.shopify.com/store/g00z01-ua/settings/apps/development`
2. Намери `ZooPetShop-Agent` → кликни **"Инсталирай"**
3. Копирай **Admin API access token** (`shpat_...`)
4. Запази го — ще го използваш в n8n и в агента

---

## Стъпка 2: n8n Конфигурация

### 2.1 Създай Shopify Credential в n8n

1. Отвори n8n.cloud dashboard
2. Settings → Credentials → **Add Credential**
3. Тип: **Shopify API**
4. Попълни:
   - **Store subdomain**: `g00z01-ua`
   - **Access Token**: `shpat_...` (от Стъпка 1)
   - **Shared Secret**: `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`
5. Натисни **Save**

### 2.2 Import Workflows

Импортирай всеки JSON файл:

| Файл | Описание |
|------|----------|
| `n8n-workflow-orders.json` | Обработка на нови поръчки + потвърждение + low stock alert |
| `n8n-workflow-products.json` | Hourly sync на продукти + out-of-stock alert |
| `n8n-workflow-cart-recovery.json` | Изоставена количка → recovery email след 3 часа |
| `n8n-workflow-customer-support.json` | Claude AI отговори на клиентски заявки |

За всеки workflow:
1. n8n → **Workflows** → **Import from File**
2. Избери JSON файла
3. Замени `SHOPIFY_CREDENTIAL_ID` с ID на твоя Shopify credential
4. Замени `YOUR_ADMIN_API_TOKEN` с `shpat_...` token
5. Замени `YOUR_CLAUDE_API_KEY` с Anthropic API key (за customer support workflow)
6. Замени `YOUR_AGENT_URL` с URL на твоя agent dashboard
7. **Activate** workflow-а

### 2.3 Настрой Shopify Webhooks

В Shopify Admin → Settings → Notifications → Webhooks:

| Webhook | URL | Event |
|---------|-----|-------|
| Orders | `https://YOUR_N8N_URL/webhook/shopify-orders` | Order creation |
| Carts | `https://YOUR_N8N_URL/webhook/shopify-carts` | Checkout creation |
| Support | `https://YOUR_N8N_URL/webhook/customer-support` | Manual / form |

---

## Стъпка 3: Agent Dashboard Конфигурация

Отвори артифакта `dual_agent_system.jsx` → таб **Настройки**:

1. **n8n Base URL**: URL на твоя n8n instance (напр. `https://your-instance.app.n8n.cloud`)
2. **n8n API Key**: от n8n Settings → API → Create API Key
3. **Shopify Store Domain**: `zoo-petshop.com`
4. **Shopify Admin API Token**: `shpat_...`
5. **Anthropic API Key**: `sk-ant-...`
6. Натисни **"Свържи агентите"**

---

## Стъпка 4: Обучител — Claude API Setup

Обучителят използва Claude API за:
- Анализ на логове от n8n executions
- Генериране на нови правила за автоматизация
- A/B тестване на различни стратегии

Конфигурация:
1. Вземи API key от `console.anthropic.com`
2. Въведи го в настройките на Агент-обучител
3. Обучителят автоматично ще:
   - Анализира логове всеки 6 часа
   - Предлага нови workflow оптимизации
   - Проследява KPI (open rate, conversion, response time)

---

## Workflow диаграми

### Order Processing Flow
```
Shopify Webhook → Is New Order? → Get Order Details → Send Confirmation → Log
                                → Check Inventory → Low Stock? → Alert Email
```

### Product Sync Flow
```
Every Hour → Get All Products → Out of Stock? → Alert Email
                                              → Log Sync
```

### Cart Recovery Flow
```
Cart Webhook → Wait 3h → Check Status → Still Abandoned? → Recovery Email → Log
```

### Customer Support Flow
```
Support Webhook → Find Customer → Is VIP? → Claude VIP Response → Reply Email → Log
                                           → Claude Standard Response → Reply Email → Log
```

---

## Мониторинг

- **n8n Executions**: Проверявай в n8n dashboard за failed executions
- **Agent Dashboard**: Логове таб показва всички действия в реално време
- **Обучител**: Анализ таб показва открити проблеми и аномалии

---

## Контакти

- **Shopify Store**: zoo-petshop.com
- **API Email**: simeon._.manolov@icloud.com
- **Account**: Vasya Manolova
