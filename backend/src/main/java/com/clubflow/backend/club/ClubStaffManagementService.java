package com.clubflow.backend.club;

import com.clubflow.backend.club.dto.ChangeClubStaffRoleRequest;
import com.clubflow.backend.club.dto.ClubStaffInvitationResponse;
import com.clubflow.backend.club.dto.ClubStaffResponse;
import com.clubflow.backend.club.dto.CreateClubStaffInvitationRequest;
import com.clubflow.backend.common.ConflictException;
import com.clubflow.backend.common.ForbiddenException;
import com.clubflow.backend.common.InvalidRequestException;
import com.clubflow.backend.common.NotFoundException;
import com.clubflow.backend.user.User;
import com.clubflow.backend.user.UserRepository;
import com.clubflow.backend.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

@Service
@Transactional(readOnly = true)
public class ClubStaffManagementService {

    private static final String INVITATION_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ClubRepository clubRepository;
    private final ClubStaffRepository clubStaffRepository;
    private final ClubStaffInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final UserService userService;

    public ClubStaffManagementService(
            ClubRepository clubRepository,
            ClubStaffRepository clubStaffRepository,
            ClubStaffInvitationRepository invitationRepository,
            UserRepository userRepository,
            UserService userService
    ) {
        this.clubRepository = clubRepository;
        this.clubStaffRepository = clubStaffRepository;
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    public List<ClubStaffResponse> listStaff(String googleSub, UUID clubId) {
        requirePresident(googleSub, clubId);
        return clubStaffRepository.findAllByClubIdWithUser(clubId).stream()
                .map(ClubStaffResponse::from)
                .toList();
    }

    @Transactional
    public ClubStaffInvitationResponse invite(
            String googleSub,
            UUID clubId,
            CreateClubStaffInvitationRequest request
    ) {
        User president = requirePresident(googleSub, clubId).getUser();
        validateAssignableRole(request.role());
        String email = normalizeEmail(request.email());
        Club club = clubRepository.findById(clubId)
                .orElseThrow(() -> new NotFoundException("동아리를 찾을 수 없습니다."));

        userRepository.findByEmailIgnoreCase(email)
                .flatMap(user -> clubStaffRepository.findByClubIdAndUserId(clubId, user.getId()))
                .filter(staff -> staff.getStatus() == ClubStaffStatus.APPROVED)
                .ifPresent(staff -> {
                    throw new ConflictException("이미 이 동아리의 운영진입니다.");
                });
        if (invitationRepository.existsByClubIdAndEmailIgnoreCaseAndStatus(
                clubId, email, ClubStaffInvitationStatus.PENDING)) {
            throw new ConflictException("이미 초대 대기 중인 이메일입니다.");
        }

        String invitationCode = generateInvitationCode();
        ClubStaffInvitation invitation = ClubStaffInvitation.create(
                club, email, request.role(), president, hashInvitationCode(invitationCode));
        return ClubStaffInvitationResponse.created(invitationRepository.save(invitation), invitationCode);
    }

    public List<ClubStaffInvitationResponse> listClubInvitations(String googleSub, UUID clubId) {
        requirePresident(googleSub, clubId);
        return invitationRepository.findAllByClubIdWithInviter(clubId).stream()
                .map(ClubStaffInvitationResponse::from)
                .toList();
    }

    @Transactional
    public ClubStaffInvitationResponse cancelInvitation(String googleSub, UUID clubId, UUID invitationId) {
        requirePresident(googleSub, clubId);
        ClubStaffInvitation invitation = invitationRepository.findByIdForUpdate(invitationId)
                .orElseThrow(() -> new NotFoundException("운영진 초대를 찾을 수 없습니다."));
        if (!invitation.getClub().getId().equals(clubId)) {
            throw new ForbiddenException("다른 동아리의 초대를 변경할 수 없습니다.");
        }
        try {
            invitation.cancel();
        } catch (IllegalStateException exception) {
            throw new ConflictException(exception.getMessage());
        }
        return ClubStaffInvitationResponse.from(invitation);
    }

    public List<ClubStaffInvitationResponse> listMyInvitations(String googleSub) {
        User user = userService.getByGoogleSub(googleSub);
        return invitationRepository.findAllByEmailWithClubAndInviter(user.getEmail()).stream()
                .map(ClubStaffInvitationResponse::from)
                .toList();
    }

    @Transactional
    public ClubStaffResponse acceptInvitation(String googleSub, UUID invitationId) {
        User user = userService.getByGoogleSub(googleSub);
        ClubStaffInvitation invitation = requireInvitationForUser(invitationId, user);
        return acceptInvitation(invitation, user);
    }

    @Transactional
    public ClubStaffInvitationResponse acceptInvitationByCode(String googleSub, String rawCode) {
        User user = userService.getByGoogleSub(googleSub);
        String normalizedCode = rawCode.trim().toUpperCase(Locale.ROOT);
        ClubStaffInvitation invitation = invitationRepository.findByCodeHashForUpdate(
                        hashInvitationCode(normalizedCode))
                .orElseThrow(() -> new NotFoundException("유효한 초대 코드를 찾을 수 없습니다."));
        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new ForbiddenException("초대받은 Google 이메일로 로그인해 주세요.");
        }
        acceptInvitation(invitation, user);
        return ClubStaffInvitationResponse.from(invitation);
    }

    private ClubStaffResponse acceptInvitation(ClubStaffInvitation invitation, User user) {
        ClubStaff existing = clubStaffRepository.findByClubIdAndUserIdForUpdate(
                invitation.getClub().getId(), user.getId()).orElse(null);

        if (invitation.getStatus() == ClubStaffInvitationStatus.ACCEPTED) {
            if (existing == null || existing.getStatus() != ClubStaffStatus.APPROVED) {
                throw new ConflictException("처리된 초대와 운영진 상태가 일치하지 않습니다.");
            }
            return ClubStaffResponse.from(existing);
        }
        if (invitation.getStatus() != ClubStaffInvitationStatus.PENDING) {
            throw new ConflictException("이미 처리된 초대입니다.");
        }
        if (existing != null && existing.getStatus() == ClubStaffStatus.APPROVED) {
            throw new ConflictException("이미 이 동아리의 운영진입니다.");
        }

        ClubStaff staff;
        if (existing == null) {
            staff = clubStaffRepository.save(ClubStaff.createApproved(
                    invitation.getClub(), user, invitation.getRole()));
        } else {
            existing.approveAgain(invitation.getRole());
            staff = existing;
        }
        invitation.accept();
        return ClubStaffResponse.from(staff);
    }

    @Transactional
    public ClubStaffInvitationResponse rejectInvitation(String googleSub, UUID invitationId) {
        User user = userService.getByGoogleSub(googleSub);
        ClubStaffInvitation invitation = requireInvitationForUser(invitationId, user);
        if (invitation.getStatus() == ClubStaffInvitationStatus.REJECTED) {
            return ClubStaffInvitationResponse.from(invitation);
        }
        try {
            invitation.reject();
        } catch (IllegalStateException exception) {
            throw new ConflictException(exception.getMessage());
        }
        return ClubStaffInvitationResponse.from(invitation);
    }

    @Transactional
    public ClubStaffResponse changeRole(
            String googleSub,
            UUID clubId,
            UUID staffId,
            ChangeClubStaffRoleRequest request
    ) {
        requirePresident(googleSub, clubId);
        validateAssignableRole(request.role());
        ClubStaff staff = requireStaffInClub(staffId, clubId);
        protectPresident(staff);
        if (staff.getStatus() != ClubStaffStatus.APPROVED) {
            throw new ConflictException("권한이 해제된 운영진의 역할은 변경할 수 없습니다.");
        }
        staff.changeRole(request.role());
        return ClubStaffResponse.from(staff);
    }

    @Transactional
    public ClubStaffResponse revoke(String googleSub, UUID clubId, UUID staffId) {
        requirePresident(googleSub, clubId);
        ClubStaff staff = requireStaffInClub(staffId, clubId);
        protectPresident(staff);
        staff.revoke();
        return ClubStaffResponse.from(staff);
    }

    private ClubStaffInvitation requireInvitationForUser(UUID invitationId, User user) {
        ClubStaffInvitation invitation = invitationRepository.findByIdForUpdate(invitationId)
                .orElseThrow(() -> new NotFoundException("운영진 초대를 찾을 수 없습니다."));
        if (!invitation.getEmail().equalsIgnoreCase(user.getEmail())) {
            throw new ForbiddenException("본인에게 온 초대만 처리할 수 있습니다.");
        }
        return invitation;
    }

    private ClubStaff requirePresident(String googleSub, UUID clubId) {
        User currentUser = userService.getByGoogleSub(googleSub);
        ClubStaff staff = clubStaffRepository.findAccessibleClub(
                        clubId, currentUser.getId(), ClubStaffStatus.APPROVED)
                .orElseThrow(() -> new ForbiddenException("해당 동아리에 접근할 권한이 없습니다."));
        if (staff.getRole() != ClubStaffRole.PRESIDENT) {
            throw new ForbiddenException("회장만 운영진을 관리할 수 있습니다.");
        }
        return staff;
    }

    private ClubStaff requireStaffInClub(UUID staffId, UUID clubId) {
        ClubStaff staff = clubStaffRepository.findByIdAndClubIdForUpdate(staffId, clubId)
                .orElseThrow(() -> new NotFoundException("운영진 정보를 찾을 수 없습니다."));
        return staff;
    }

    private void protectPresident(ClubStaff staff) {
        if (staff.getRole() == ClubStaffRole.PRESIDENT) {
            throw new ConflictException("회장 권한은 변경하거나 해제할 수 없습니다.");
        }
    }

    private void validateAssignableRole(ClubStaffRole role) {
        if (role == null || role == ClubStaffRole.PRESIDENT) {
            throw new InvalidRequestException("부회장 또는 운영진 역할만 선택할 수 있습니다.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String generateInvitationCode() {
        StringBuilder code = new StringBuilder(8);
        for (int index = 0; index < 8; index++) {
            code.append(INVITATION_CODE_CHARS.charAt(SECURE_RANDOM.nextInt(INVITATION_CODE_CHARS.length())));
        }
        return code.toString();
    }

    private static String hashInvitationCode(String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("초대 코드를 처리할 수 없습니다.", exception);
        }
    }
}
