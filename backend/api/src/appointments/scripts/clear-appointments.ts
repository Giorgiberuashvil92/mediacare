/**
 * სკრიპტი ყველა ჯავშნის (appointments) წასაშლელად ბაზაში.
 *
 * გაშვება: backend/api დირექტორიიდან
 *   npm run clear:appointments
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../../app.module';
import { Appointment } from '../schemas/appointment.schema';

async function clearAppointments() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const appointmentModel = app.get(getModelToken(Appointment.name));

  console.log('🗑️  ჯავშნების წაშლა...');

  const result = await appointmentModel.deleteMany({});
  const deleted = result.deletedCount ?? 0;

  console.log(`✅ წაშლილია ${deleted} ჯავშანი.`);
  await app.close();
}

clearAppointments()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('შეცდომა:', err);
    process.exit(1);
  });
