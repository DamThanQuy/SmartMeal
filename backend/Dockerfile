# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["SmartMeal.Domain/SmartMeal.Domain.csproj", "SmartMeal.Domain/"]
COPY ["SmartMeal.Application/SmartMeal.Application.csproj", "SmartMeal.Application/"]
COPY ["SmartMeal.Infrastructure/SmartMeal.Infrastructure.csproj", "SmartMeal.Infrastructure/"]
COPY ["SmartMeal.API/SmartMeal.API.csproj", "SmartMeal.API/"]

RUN dotnet restore "SmartMeal.API/SmartMeal.API.csproj"

# Copy everything and build
COPY . .
WORKDIR "/src/SmartMeal.API"
RUN dotnet build "SmartMeal.API.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "SmartMeal.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final Runtime Image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "SmartMeal.API.dll"]
