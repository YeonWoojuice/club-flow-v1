package com.clubflow.backend.google;

import com.clubflow.backend.common.ConflictException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class GoogleTokenCipher {

    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final String encodedKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public GoogleTokenCipher(@Value("${app.google-data.encryption-key:}") String encodedKey) {
        this.encodedKey = encodedKey;
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(
                    ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array()
            );
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw configurationError();
        }
    }

    public String decrypt(String encoded) {
        try {
            byte[] payload = Base64.getDecoder().decode(encoded);
            if (payload.length <= IV_LENGTH) throw new IllegalArgumentException("invalid payload");
            ByteBuffer buffer = ByteBuffer.wrap(payload);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw configurationError();
        }
    }

    private SecretKeySpec key() {
        byte[] decoded = Base64.getDecoder().decode(encodedKey);
        if (decoded.length != 32) throw new IllegalArgumentException("key must be 32 bytes");
        return new SecretKeySpec(decoded, "AES");
    }

    private ConflictException configurationError() {
        return new ConflictException("Google 데이터 연결 암호화 설정을 확인해 주세요.");
    }
}
