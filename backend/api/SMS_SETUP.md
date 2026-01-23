# SMS ვერიფიკაციის კონფიგურაცია

## Twilio-ს დაყენება

### 1. Twilio ანგარიშის შექმნა
1. გადადით https://www.twilio.com
2. შექმენით უფასო ანგარიში
3. გადადით Console-ში: https://www.twilio.com/console

### 2. Twilio Credentials-ების მიღება
1. Console-ში იხილავთ:
   - **Account SID** - ეს არის `TWILIO_ACCOUNT_SID`
   - **Auth Token** - ეს არის `TWILIO_AUTH_TOKEN` (დააჭირეთ "show" რომ ნახოთ)

### 3. ტელეფონის ნომრის მიღება
1. Twilio Console-ში გადადით "Phone Numbers" → "Manage" → "Buy a number"
2. აირჩიეთ ქვეყანა (საქართველო - Georgia)
3. შეიძინეთ ნომერი (უფასო trial-ზე შეგიძლიათ გამოიყენოთ Twilio-ს ტესტ ნომერი)

### 4. Environment Variables-ების დაყენება
დაამატეთ `.env` ფაილში (ან production environment-ში):

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+995555123456  # თქვენი Twilio ნომერი E.164 ფორმატში
```

### 5. Package-ის ინსტალაცია
```bash
cd backend/api
npm install twilio
```

### 6. Server-ის გადატვირთვა
Server-ის გადატვირთვის შემდეგ, SMS სერვისი ავტომატურად გამოიყენებს Twilio-ს.

## ტესტირება

1. გაუშვით backend server
2. გამოიყენეთ `/auth/send-verification-code` endpoint
3. შეამოწმეთ ტელეფონზე მოვიდა თუ არა SMS

## Dev Mode

თუ Twilio credentials არ არის კონფიგურირებული, სისტემა ავტომატურად გადადის dev mode-ში და კოდს კონსოლში იწერს.

## ქართული SMS პროვაიდერები (ალტერნატივა)

თუ გსურთ ქართული SMS პროვაიდერის გამოყენება (მაგ. Magti, Beeline), დაგჭირდებათ:
1. მათი API documentation-ის შესწავლა
2. `sms.service.ts`-ის განახლება მათი API-სთვის

## Troubleshooting

- **"Twilio package not found"**: გაუშვით `npm install twilio`
- **"Invalid phone number"**: დარწმუნდით რომ ნომერი E.164 ფორმატშია (+995...)
- **"Unauthorized"**: შეამოწმეთ Account SID და Auth Token
- **"The number is unverified"**: Twilio trial-ზე შეგიძლიათ გამოიყენოთ მხოლოდ verified ნომრები
