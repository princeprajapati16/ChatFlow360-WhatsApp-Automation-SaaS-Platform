from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from apps.organizations.models import Organization, OrganizationMember
from apps.organizations.serializers import (
    OrganizationSerializer,
    OrganizationMemberSerializer,
    InviteMemberSerializer,
)
from apps.organizations.permissions import IsBusinessAdmin, IsSuperAdmin

User = get_user_model()


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    CRUD for organizations.
    Users can only see orgs they're members of.
    Creating an org auto-assigns them as Super Admin.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Organization.objects.filter(
            members__user=self.request.user,
            members__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        org = self.get_object()

        if request.method == "GET":
            members = OrganizationMember.objects.filter(
                organization=org
            ).select_related("user")
            serializer = OrganizationMemberSerializer(members, many=True)
            return Response(serializer.data)

        # POST — invite member (Business Admin+)
        invite_ser = InviteMemberSerializer(data=request.data)
        invite_ser.is_valid(raise_exception=True)
        data = invite_ser.validated_data

        user = User.objects.get(email=data["email"])
        member, created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": data["role"]},
        )
        if not created:
            member.role = data["role"]
            member.is_active = True
            member.save()

        return Response(
            OrganizationMemberSerializer(member).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"members/(?P<member_id>[^/.]+)",
    )
    def member_detail(self, request, pk=None, member_id=None):
        org = self.get_object()
        try:
            member = OrganizationMember.objects.get(id=member_id, organization=org)
        except OrganizationMember.DoesNotExist:
            return Response(
                {"error": "Member not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.method == "DELETE":
            member.is_active = False
            member.save()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH — update role
        member.role = request.data.get("role", member.role)
        member.save()
        return Response(OrganizationMemberSerializer(member).data)
