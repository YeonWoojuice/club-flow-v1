package com.clubflow.backend.person;

import com.clubflow.backend.club.Club;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class PersonService {

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    @Transactional
    public Person findOrCreate(
            Club club,
            String name,
            String email,
            String phone,
            String studentNumber,
            String discordName
    ) {
        String normalizedEmail = normalizeEmail(email);
        return personRepository.findByClubIdAndEmail(club.getId(), normalizedEmail)
                .map(person -> {
                    person.updateProfile(name, phone, studentNumber, discordName);
                    return person;
                })
                .orElseGet(() -> personRepository.save(Person.create(
                        club,
                        name,
                        normalizedEmail,
                        phone,
                        studentNumber,
                        discordName
                )));
    }

    public Person findOrCreate(Club club, String name, String email, String phone, String studentNumber) {
        return findOrCreate(club, name, email, phone, studentNumber, null);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
