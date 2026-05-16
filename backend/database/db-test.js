import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Thesis from './models/thesis.js';
import {updateThesisEntry, deleteThesisEntry, findThesisByLink } from './services/thesisService.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');

    const thesisCount = await Thesis.countDocuments();
    console.log(`Theses in database: ${thesisCount}`);

    if (thesisCount === 0) {
      await Thesis.create({
        title: 'Muutosjohtaminen: organisaation toimivan muuton edellytykset',
        author: 'Tolonen, Marja',
        year: 2024,
        university: 'Centria UAS',
        university_code: 'CENTRIA',
        handle: 'handle/10024/830287',
        thesisId: 'null',
        link: 'https://www.theseus.fi/handle/10024/830287',
        abstract_text: `Tämän opinnäytetyön tavoite oli kyselytutkimuksen avulla ymmärtää, millainen merkitys golfkenttien piha-alueilla on yrityksen vetovoimaan ja kannattaako niitä kehittää. Tutkimuskysymykset olivat: kiinnittävätkö golfkentän vierailijat huomiota piha-alueisiin ja minkälaista kehitystä he haluaisivat?
                      Työn tilaaja, Nokia River Golf, on vuodesta 2024 toteuttanut uutta pihasuunnitelmaa, jonka tarkoituksena on parantaa piha-alueiden viihtyvyyttä, ottaen huomioon myös ympäristönäkökulman. Nokia River Golf on kiinnostunut asiakkaiden näkökulmasta, jota tässä työssä selvitettiin kyselyn avulla.
                      Kyselyyn vastasi 185 henkilöä ja sen mukaan suurin osa vierailijoista huomioi piha-alueet aina tai usein. Noin 60 prosenttia valitsisi golfkentän, jolla on runsaasti istutuksia, ja noin 39 prosenttia golfkentän, jolla on hillitysti istutuksia.
                      Johtopäätökseksi tuli, että piha-alueilla on rooli yrityksen vetovoimaan viihtyvyyden kannalta.`,
        rule_score: 13,
        rule_label: 'NOKIA_COLLABORATION',
        rule_reasons: 'Nokia mentioned',
        openAI_decision: 'no',
        openAI_evidence:
          'The thesis was commissioned by Nokia River Golf, which is a golf company, not Nokia Corporation.'
      });

      console.log('Inserted example thesis.');
    } else {
      console.log('Database already contains theses.');
    }

 /*
    const update = await updateThesisEntry('6a04fd61e885163a6fce59ca', {
      otitle: 'Muutosjohtaminen: organisaation toimivan muuton edellytykset',
        author: 'Tolonen, Marja',
        year: 2024,
        university: 'Centria UAS',
        university_code: '10024/1900',
        handle: 'handle/10024/830287',
        thesisId: 'null'
        link: 'https://www.theseus.fi/handle/10024/830287',
        abstract_text: `Tämän opinnäytetyön tavoite oli kyselytutkimuksen avulla ymmärtää, millainen merkitys golfkenttien piha-alueilla on yrityksen vetovoimaan ja kannattaako niitä kehittää. Tutkimuskysymykset olivat: kiinnittävätkö golfkentän vierailijat huomiota piha-alueisiin ja minkälaista kehitystä he haluaisivat?
                      Työn tilaaja, Nokia River Golf, on vuodesta 2024 toteuttanut uutta pihasuunnitelmaa, jonka tarkoituksena on parantaa piha-alueiden viihtyvyyttä, ottaen huomioon myös ympäristönäkökulman. Nokia River Golf on kiinnostunut asiakkaiden näkökulmasta, jota tässä työssä selvitettiin kyselyn avulla.
                      Kyselyyn vastasi 185 henkilöä ja sen mukaan suurin osa vierailijoista huomioi piha-alueet aina tai usein. Noin 60 prosenttia valitsisi golfkentän, jolla on runsaasti istutuksia, ja noin 39 prosenttia golfkentän, jolla on hillitysti istutuksia.
                      Johtopäätökseksi tuli, että piha-alueilla on rooli yrityksen vetovoimaan viihtyvyyden kannalta.`,
        rule_score: 13,
        rule_reasons: 'Nokia mentioned',
        openAI_decision: 'no',
        openAI_evidence:
          'The thesis was commissioned by Nokia River Golf, which is a golf company, not Nokia Corporation.'

    });
    */

  //  await deleteThesisEntry('6a04fd61e885163a6fce59ca');

    const allTheses = await Thesis.find();
    console.log('All theses:', allTheses);

    const thesisByLink = await findThesisByLink('https://www.theseus.fi/handle/10024/830287');
    console.log('Thesis by link:', thesisByLink);


    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error(error);
  }
};


connectDB();