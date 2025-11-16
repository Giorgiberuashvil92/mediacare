import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import { Specialization } from './schemas/specialization.schema';
import { SpecializationsService } from './specializations.service';

const specializations = [
  {
    name: 'ნევროლოგია',
    description: 'ნევროლოგია - ნერვული სისტემის დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['თავის ტკივილი', 'თავბრუსხვევა', 'ნევრალგია'],
  },
  {
    name: 'კარდიოლოგია',
    description:
      'კარდიოლოგია - გულის და სისხლძარღვების დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['სისხლის წნევა', 'გულის ტკივილი', 'გულისცემა'],
  },
  {
    name: 'გინეკოლოგია',
    description: 'გინეკოლოგია - ქალთა რეპროდუქციული ჯანმრთელობა',
    isActive: true,
    symptoms: ['მენსტრუალური დარღვევები', 'ქალთა ჯანმრთელობის პრობლემები'],
  },
  {
    name: 'პედიატრია',
    description: 'პედიატრია - ბავშვთა ჯანმრთელობა',
    isActive: true,
    symptoms: ['ცხელება', 'ხველა', 'ბავშვთა დაავადებები'],
  },
  {
    name: 'ალერგოლოგია',
    description: 'ალერგოლოგია - ალერგიული რეაქციების მკურნალობა',
    isActive: true,
    symptoms: ['ალერგია', 'ქავილი', 'ალერგიული რეაქციები'],
  },
  {
    name: 'სტომატოლოგია',
    description: 'სტომატოლოგია - კბილებისა და პირის ღრუს მკურნალობა',
    isActive: true,
    symptoms: ['კბილის ტკივილი', 'პირის ღრუს პრობლემები'],
  },
  {
    name: 'უროლოგია',
    description: 'უროლოგია - შარდსასქესო სისტემის დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['შარდის პრობლემები', 'შარდსასქესო სისტემის დაავადებები'],
  },
  {
    name: 'გასტროენტეროლოგია',
    description: 'გასტროენტეროლოგია - საჭმლის მომნელებელი სისტემის მკურნალობა',
    isActive: true,
    symptoms: ['მუცლის ტკივილი', 'დიაბეტი', 'საჭმლის მომნელებელი პრობლემები'],
  },
  {
    name: 'დერმატოლოგია',
    description: 'დერმატოლოგია - კანის დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['კანის პრობლემები', 'ქავილი', 'კანის დაავადებები'],
  },
  {
    name: 'ორთოპედია',
    description:
      'ორთოპედია - ძვლების, სახსრებისა და კუნთების დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['სახსრების ტკივილი', 'ძვლების პრობლემები'],
  },
  {
    name: 'ოფთალმოლოგია',
    description: 'ოფთალმოლოგია - თვალების დაავადებების მკურნალობა',
    isActive: true,
    symptoms: ['თვალების პრობლემები', 'მხედველობის დაქვეითება'],
  },
  {
    name: 'ფსიქოლოგია',
    description: 'ფსიქოლოგია - ფსიქიკური ჯანმრთელობა',
    isActive: true,
    symptoms: ['სტრესი', 'დეპრესია', 'ფსიქიკური პრობლემები'],
  },
];

async function seedSpecializations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const specializationsService = app.get(SpecializationsService);

  console.log('🌱 Starting to seed specializations...');

  // Delete all existing specializations first
  try {
    const specializationModel = app.get(getModelToken(Specialization.name));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await specializationModel.deleteMany({});
    console.log('🗑️  Deleted all existing specializations');
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error('⚠️  Error deleting existing specializations:', errorMessage);
  }

  // Create new specializations with Georgian names
  for (const spec of specializations) {
    try {
      const result = await specializationsService.create(spec);
      if (result.success) {
        console.log(`✅ Created: ${spec.name}`);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`❌ Error creating ${spec.name}:`, errorMessage);
    }
  }

  console.log('✨ Specializations seeding completed!');
  await app.close();
}

seedSpecializations()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
