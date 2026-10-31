# Imagem do back para a AWS (ECS Fargate, App Runner, Elastic Beanstalk "Docker" ou EC2).
# Build:  docker build -t projetos-mamore-back ./back
# Rodar:  docker run --env-file projetos-mamore-aws.env -p 8080:8080 projetos-mamore-back
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY src src
RUN ./mvnw -q -B package -DskipTests && cp target/projetos-mamore-*.jar /app.jar

FROM eclipse-temurin:21-jre
# Usuário sem privilégios; o jar fica só para leitura.
RUN groupadd --system projetos && useradd --system --gid projetos --no-create-home --shell /usr/sbin/nologin projetos
WORKDIR /app
COPY --from=build --chown=root:root --chmod=444 /app.jar /app/projetos-mamore.jar
USER projetos
ENV SPRING_PROFILES_ACTIVE=aws \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError -Dfile.encoding=UTF-8"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/projetos-mamore.jar"]
